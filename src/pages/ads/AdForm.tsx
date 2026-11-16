import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ImagePlus, Loader2, X } from 'lucide-react'
import { createAd, fetchAd, updateAd, type AdInput } from '../../api/ads'
import { uploadFile } from '../../api/uploads'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { Loader } from '../../components/ui/Loader'
import type { AdItem, AdSlot } from '../../types/api'

const labelClass = 'text-[13px] font-semibold text-heading'
const inputClass =
  'w-full rounded-lg border border-card-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-orange focus:outline-none'

const adTypeOptions = ['Banner', 'Popup Banner', 'Sidebar Ad', 'Interstitial', 'Banner Card', 'Native Feed Ad']

// Each placement area maps to the slot size the public site renders it in.
const placementOptions: { label: string; slot: AdSlot }[] = [
  { label: 'All Pages', slot: 'banner' },
  { label: 'Homepage', slot: 'banner' },
  { label: 'Home Page Hero', slot: 'leaderboard' },
  { label: 'Home Page Sidebar', slot: 'rectangle' },
  { label: 'Knowledge Hub', slot: 'banner' },
  { label: 'Blog Listing', slot: 'banner' },
  { label: 'Events Page', slot: 'banner' },
  { label: 'Temple Directory', slot: 'rectangle' },
  { label: 'Site-wide Popup', slot: 'rectangle' },
]

type FormStatus = 'draft' | 'active' | 'paused'

const priorityOptions: { value: NonNullable<AdItem['priority']>; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const statusOptions: { value: FormStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
]

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function SelectField({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

export function AdForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(isEdit)

  const [title, setTitle] = useState('')
  const [advertiser, setAdvertiser] = useState('')
  const [adType, setAdType] = useState('')
  const [placement, setPlacement] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [budget, setBudget] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [priority, setPriority] = useState<NonNullable<AdItem['priority']>>('medium')
  const [status, setStatus] = useState<FormStatus>('draft')
  const [description, setDescription] = useState('')
  const [existingSlot, setExistingSlot] = useState<AdSlot | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'publish' | 'draft' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false

    fetchAd(id)
      .then((ad) => {
        if (cancelled) return
        setTitle(ad.title ?? '')
        setAdvertiser(ad.advertiser ?? '')
        setAdType(ad.adType ?? '')
        setPlacement(ad.page ?? '')
        setStartDate(toDateInput(ad.startsAt))
        setEndDate(toDateInput(ad.endsAt))
        setBudget(Number(ad.revenueRupees) ? String(Number(ad.revenueRupees)) : '')
        setImageUrl(ad.imageUrl)
        setLinkUrl(ad.linkUrl ?? '')
        setPriority(ad.priority ?? 'medium')
        setStatus(ad.isDraft ? 'draft' : ad.isActive ? 'active' : 'paused')
        setDescription(ad.description ?? '')
        setExistingSlot(ad.placement)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load this advertisement.')))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return setError('Upload a PNG, JPG or WEBP image.')
    if (file.size > 10 * 1024 * 1024) return setError('The creative must be 10MB or smaller.')
    setIsUploading(true)
    setError(null)
    try {
      setImageUrl((await uploadFile(file)).url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload the creative.'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function submit(action: 'publish' | 'draft') {
    setError(null)
    if (!title.trim()) return setError('Ad title is required.')
    if (!imageUrl) return setError('Upload the ad creative image.')
    if (startDate && endDate && endDate < startDate) return setError('End date must be on or after the start date.')
    if (budget && Number(budget) < 0) return setError('Budget cannot be negative.')

    // Editing honours the Status select; on create, "Publish Ad" always goes live unless paused.
    const isDraft = action === 'draft' || (isEdit && status === 'draft')
    const area = placementOptions.find((o) => o.label === placement)
    const payload: AdInput = {
      title: title.trim(),
      advertiser: advertiser.trim() || undefined,
      adType: adType || undefined,
      placement: area?.slot ?? existingSlot ?? 'banner',
      page: placement || undefined,
      imageUrl,
      linkUrl: linkUrl.trim() || undefined,
      isActive: isDraft ? false : status !== 'paused',
      isDraft,
      startsAt: startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined,
      endsAt: endDate ? new Date(`${endDate}T23:59:59`).toISOString() : undefined,
      revenueRupees: budget ? Number(budget) : undefined,
      priority,
      description: description.trim() || undefined,
    }

    setSubmittingAction(action)
    try {
      if (isEdit && id) await updateAd(id, payload)
      else await createAd(payload)
      navigate('/advertisement')
    } catch (err) {
      setError(apiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} this advertisement.`))
    } finally {
      setSubmittingAction(null)
    }
  }

  if (isLoading) return <Loader label="Loading advertisement…" />

  const busy = submittingAction !== null || isUploading
  // Keep a placement the admin chose earlier selectable even if it is not in the preset list.
  const placementChoices = placement && !placementOptions.some((o) => o.label === placement) ? [{ label: placement, slot: existingSlot ?? 'banner' }, ...placementOptions] : placementOptions
  const typeChoices = adType && !adTypeOptions.includes(adType) ? [adType, ...adTypeOptions] : adTypeOptions

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-header-border bg-white p-8">
      <div className="flex items-start gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-title">
              Ad Title
            </label>
            <input id="ad-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Phalguna Mela VIP Darshan Passes" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-advertiser">
              Advertiser Name
            </label>
            <input id="ad-advertiser" value={advertiser} onChange={(e) => setAdvertiser(e.target.value)} className={inputClass} placeholder="e.g. Shree Shyam Mandir Committee" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-type">
              Ad Type
            </label>
            <SelectField id="ad-type" value={adType} onChange={setAdType}>
              <option value="">Select Ad Type</option>
              {typeChoices.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-placement">
              Placement
            </label>
            <SelectField id="ad-placement" value={placement} onChange={setPlacement}>
              <option value="">Select Placement Area</option>
              {placementChoices.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-start">
                Start Date
              </label>
              <input id="ad-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-end">
                End Date
              </label>
              <input id="ad-end" type="date" min={startDate || undefined} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-budget">
              Budget / Cost
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted">₹</span>
              <input
                id="ad-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={`${inputClass} pl-8`}
                placeholder="e.g. 50000"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Ad Creative</span>
            {isEdit && imageUrl ? (
              <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-search-bg p-3">
                <img src={resolveUploadUrl(imageUrl) ?? undefined} alt="Ad creative" className="h-[130px] w-full rounded-lg object-cover" />
                <div className="flex items-center justify-between gap-3 text-xs">
                  <p className="min-w-0 truncate text-muted">{decodeURIComponent(imageUrl.split('?')[0].split('/').pop() ?? '')}</p>
                  <label className="shrink-0 cursor-pointer font-semibold text-orange hover:underline">
                    {isUploading ? 'Uploading…' : 'Change'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFile(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative flex h-[180px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-dashed text-center transition-colors ${
                isDragging ? 'border-orange bg-orange/5' : 'border-card-border bg-search-bg'
              }`}
            >
              {imageUrl ? (
                <>
                  <img src={resolveUploadUrl(imageUrl) ?? undefined} alt="Ad creative" className="size-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white text-heading shadow"
                    aria-label="Remove creative"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  {isUploading ? <Loader2 size={24} className="animate-spin text-orange" /> : <ImagePlus size={24} className="text-orange" />}
                  <p className="text-[13px] font-semibold text-heading">
                    {isUploading ? (
                      'Uploading…'
                    ) : (
                      <>
                        Drag &amp; drop or{' '}
                        <label className="cursor-pointer text-orange underline-offset-2 hover:underline">
                          browse
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFile(file)
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-muted">PNG, JPG or WEBP up to 10MB (Recommended: 1200x630px)</p>
                </>
              )}
            </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-link">
              Destination URL
            </label>
            <input id="ad-link" type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={inputClass} placeholder="https://example.com/landing-page" />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-priority">
                Priority
              </label>
              <SelectField id="ad-priority" value={priority} onChange={(v) => setPriority(v as NonNullable<AdItem['priority']>)}>
                {priorityOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-status">
                Status
              </label>
              <SelectField id="ad-status" value={status} onChange={(v) => setStatus(v as FormStatus)}>
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="ad-notes">
          Description / Notes
        </label>
        <textarea
          id="ad-notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          className={`${inputClass} h-[100px] resize-none`}
          placeholder="Add internal notes or a short description for this campaign…"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="h-px w-full bg-header-border" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('publish')}
          className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submittingAction === 'publish' && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Update Ad' : 'Publish Ad'}
        </button>
        {!isEdit && (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('draft')}
            className="flex items-center gap-2 rounded-lg border border-orange bg-white px-6 py-3 text-sm font-semibold text-orange transition-colors hover:bg-orange/5 disabled:opacity-60"
          >
            {submittingAction === 'draft' && <Loader2 size={14} className="animate-spin" />}
            Save as Draft
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/advertisement')}
          className={
            isEdit
              ? 'text-sm font-semibold text-maroon hover:underline'
              : 'rounded-lg border border-header-border bg-search-bg px-6 py-3 text-sm font-semibold text-heading transition-colors hover:bg-white'
          }
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
