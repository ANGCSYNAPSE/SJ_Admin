import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ImagePlus, Loader2, X } from 'lucide-react'
import { createAd, fetchAd, fetchAds, updateAd, type AdInput } from '../../api/ads'
import { uploadFile } from '../../api/uploads'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { Loader } from '../../components/ui/Loader'
import { adTitle, slotLabel } from '../../lib/ads'
import { AdPreview, THEME_COLOURS, THEME_LABELS, defaultButtonColour } from '../../components/ads/AdPreview'
import type { AdItem, AdSlot, AdTemplate, AdTheme } from '../../types/api'

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
  { label: 'Donation Page', slot: 'banner' },
  { label: 'Initiatives Page', slot: 'banner' },
  { label: 'About Page', slot: 'banner' },
  { label: 'Dharamshala Page', slot: 'leaderboard' },
  { label: 'Artists Page', slot: 'banner' },
  { label: 'Organisations Page', slot: 'leaderboard' },
  { label: 'Baba Shyam Page', slot: 'banner' },
  { label: 'Registration Pages', slot: 'leaderboard' },
  { label: 'Team Pages', slot: 'leaderboard' },
  { label: 'Footer (all pages)', slot: 'leaderboard' },
]

// How many spots of each size a page has, counting from the top of the page. An ad is given one of them and shows only there.
const AREA_SPOTS: Record<string, Partial<Record<AdSlot, number>>> = {
  Homepage: { leaderboard: 2, banner: 1, rectangle: 1 },
  'Home Page Hero': { leaderboard: 2, banner: 1, rectangle: 1 },
  'Home Page Sidebar': { leaderboard: 2, banner: 1, rectangle: 1 },
  'About Page': { leaderboard: 1, banner: 1 },
  'Artists Page': { leaderboard: 1, banner: 1 },
  'Baba Shyam Page': { leaderboard: 1, rectangle: 2, banner: 2 },
  'Blog Listing': { leaderboard: 1, rectangle: 1, banner: 1 },
  'Dharamshala Page': { leaderboard: 1 },
  'Donation Page': { leaderboard: 1, rectangle: 1, banner: 1 },
  'Events Page': { leaderboard: 1, rectangle: 1, banner: 1 },
  'Initiatives Page': { leaderboard: 1, rectangle: 1, banner: 1 },
  'Organisations Page': { leaderboard: 1 },
  'Temple Directory': { leaderboard: 1, rectangle: 1, banner: 1 },
  'Registration Pages': { leaderboard: 1, rectangle: 1 },
  'Team Pages': { leaderboard: 3 },
  'Footer (all pages)': { leaderboard: 1 },
}

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

const slotOptions: { value: AdSlot; label: string }[] = [
  { value: 'banner', label: 'Banner (970 × 250)' },
  { value: 'leaderboard', label: 'Leaderboard (728 × 90)' },
  { value: 'rectangle', label: 'Rectangle (300 × 250)' },
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
  // The size can be chosen on its own: any page area can show a banner, a leaderboard or a rectangle.
  const [slotChoice, setSlotChoice] = useState<AdSlot | ''>('')
  // Which spot of that size on the page (1 = the first from the top); empty = any spot.
  const [slotPosition, setSlotPosition] = useState<number | null>(null)
  const [otherAds, setOtherAds] = useState<AdItem[]>([])
  // How the ad is drawn: a picture on its own, or a coloured panel with a headline, text and button beside a picture.
  const [template, setTemplate] = useState<AdTemplate>('split')
  const [headline, setHeadline] = useState('')
  const [subline, setSubline] = useState('')
  const [ctaLabel, setCtaLabel] = useState('')
  const [theme, setTheme] = useState<AdTheme>('maroon')
  const [bgFrom, setBgFrom] = useState('#7a1f1f')
  const [bgTo, setBgTo] = useState('#4a1010')
  // Empty = the colour scheme's own button colour.
  const [ctaColor, setCtaColor] = useState('')

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
        setSlotChoice(ad.placement)
        setSlotPosition(ad.slotPosition ?? null)
        setTemplate(ad.template ?? 'image')
        setHeadline(ad.headline ?? '')
        setSubline(ad.subline ?? '')
        setCtaLabel(ad.ctaLabel ?? '')
        setTheme(ad.theme ?? 'maroon')
        if (ad.bgFrom) setBgFrom(ad.bgFrom)
        if (ad.bgTo) setBgTo(ad.bgTo)
        setCtaColor(ad.ctaColor ?? '')
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load this advertisement.')))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  useEffect(() => {
    let cancelled = false
    fetchAds()
      .then((list) => !cancelled && setOtherAds(list))
      .catch(() => undefined) // the note is a courtesy; the form works without it
    return () => {
      cancelled = true
    }
  }, [])

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
    const name = title.trim() || (template === 'split' ? headline.trim() : '')
    if (!name) return setError('Ad title is required.')
    if (template === 'split' && !headline.trim()) return setError('Write the headline that shows on the ad.')
    if (template === 'image' && !imageUrl) return setError('Upload the ad creative image.')
    if (linkUrl.trim() && !/^https?:\/\//i.test(linkUrl.trim())) return setError('The destination link must start with https://')
    if (startDate && endDate && endDate < startDate) return setError('End date must be on or after the start date.')
    if (budget && Number(budget) < 0) return setError('Budget cannot be negative.')

    // Editing honours the Status select; on create, "Publish Ad" always goes live unless paused.
    const isDraft = action === 'draft' || (isEdit && status === 'draft')
    const area = placementOptions.find((o) => o.label === placement)
    const payload: AdInput = {
      title: name,
      advertiser: advertiser.trim() || undefined,
      adType: adType || undefined,
      placement: slotChoice || (area?.slot ?? existingSlot ?? 'banner'),
      page: placement || undefined,
      // When editing, an empty value is sent so a removed picture / link / text is really cleared.
      imageUrl: imageUrl ?? (isEdit ? '' : undefined),
      linkUrl: linkUrl.trim() || (isEdit ? '' : undefined),
      template,
      headline: headline.trim() || (isEdit ? '' : undefined),
      subline: subline.trim() || (isEdit ? '' : undefined),
      ctaLabel: ctaLabel.trim() || (isEdit ? '' : undefined),
      theme,
      bgFrom: theme === 'custom' ? bgFrom : undefined,
      bgTo: theme === 'custom' ? bgTo : undefined,
      ctaColor: ctaColor || (isEdit ? '' : undefined),
      slotPosition: slotPosition ?? (isEdit ? null : undefined),
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
  const effectiveSlot: AdSlot | '' = slotChoice || (placementOptions.find((o) => o.label === placement)?.slot ?? existingSlot ?? '')
  const areaKnown = placement in AREA_SPOTS
  const spotCount = effectiveSlot ? (areaKnown ? (AREA_SPOTS[placement][effectiveSlot] ?? 0) : 3) : 0
  // Other live ads in exactly this spot: they will take turns with this one.
  const sharing = otherAds.filter(
    (a) => a.id !== id && !a.isDraft && a.isActive && (a.page ?? '') === placement && a.placement === effectiveSlot && (a.slotPosition ?? null) === slotPosition,
  )
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
              Page / section
            </label>
            <SelectField id="ad-placement" value={placement} onChange={setPlacement}>
              <option value="">Select the page or section</option>
              {placementChoices.map((o) => (
                <option key={o.label} value={o.label}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-slot">
              Ad size
            </label>
            <SelectField id="ad-slot" value={slotChoice || (placementChoices.find((o) => o.label === placement)?.slot ?? existingSlot ?? '')} onChange={(v) => setSlotChoice(v as AdSlot)}>
              <option value="">Choose the size</option>
              {slotOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="ad-position">
              Spot on the page
            </label>
            <SelectField
              id="ad-position"
              value={slotPosition === null ? '' : String(slotPosition)}
              onChange={(v) => setSlotPosition(v === '' ? null : Number(v))}
            >
              <option value="">Any spot (the website picks)</option>
              {Array.from({ length: Math.max(spotCount, slotPosition ?? 0) }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {ORDINALS[i]} spot of this size, counting from the top of the page
                </option>
              ))}
            </SelectField>
            {effectiveSlot && areaKnown && spotCount === 0 && (
              <p className="text-xs text-red-600">This page has no {slotLabel[effectiveSlot].toLowerCase()} spot. Choose another size.</p>
            )}
            <div className="rounded-lg border border-dashed border-card-border bg-search-bg/60 p-3 text-xs leading-relaxed text-muted">
              <p className="font-semibold text-heading">How this works</p>
              <p className="mt-1">An ad shows in <b>one place only</b>: the page you pick, in the spot you pick. It is never repeated on other pages.</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  <b>Example:</b> Page “Homepage”, size “Leaderboard (728 × 90)”, spot “1st” puts the ad in the first thin ad bar on the homepage, just below the top section.
                </li>
                <li>Spot “2nd” puts it in the second thin ad bar, further down the same page. Spots are counted from the top of the page, separately for each size.</li>
                <li>“Any spot” lets the website choose. When several ads go to one page, each lands in a different spot so none repeats.</li>
                <li>To show a company on three pages, create three ads, one for each page.</li>
                <li>Two ads in the same page, size and spot take turns, switching at the time set under “Ad rotation”.</li>
              </ul>
              {placement && effectiveSlot && (
                <p className="mt-2 rounded-md bg-white px-2.5 py-1.5 font-medium text-heading">
                  You chose: {placement === 'Footer (all pages)' ? 'the footer bar at the bottom of every page' : `${placement}, ${slotLabel[effectiveSlot].toLowerCase()} ad, ${slotPosition ? `${ORDINALS[slotPosition - 1]} spot from the top` : 'any spot'}`}.
                </p>
              )}
            </div>
            {sharing.length > 0 && (
              <p className="rounded-lg bg-[#fff9e6] px-3 py-2 text-xs text-[#8a6100]">
                Already in this spot: {sharing.map((a) => adTitle(a)).join(', ')}. They will take turns with this ad.
              </p>
            )}
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

      <div className="flex flex-col gap-5 rounded-xl border border-card-border bg-search-bg/50 p-6">
        <div>
          <p className="text-[15px] font-bold text-heading">Ad design</p>
          <p className="mt-0.5 text-xs text-muted">Choose how the ad looks. The picture you upload above is used by both designs.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { value: 'split', title: 'Text + picture', note: 'A coloured panel with your headline, a line of text and a button, and the picture beside it. Best for company ads.' },
              { value: 'image', title: 'Picture only', note: 'The picture you upload is the whole ad. Use this when you already have a finished banner.' },
            ] as { value: AdTemplate; title: string; note: string }[]
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setTemplate(o.value)}
              className={`rounded-xl border p-4 text-left transition-colors ${template === o.value ? 'border-orange bg-orange/5 ring-1 ring-orange' : 'border-card-border bg-white hover:border-orange/60'}`}
            >
              <p className="text-sm font-semibold text-heading">{o.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{o.note}</p>
            </button>
          ))}
        </div>

        {template === 'split' && (
          <div className="grid grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-headline">
                Headline
              </label>
              <input id="ad-headline" value={headline} maxLength={160} onChange={(e) => setHeadline(e.target.value)} className={inputClass} placeholder="e.g. Software that grows your business" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-subline">
                Line under the headline <span className="font-normal text-muted">(optional)</span>
              </label>
              <input id="ad-subline" value={subline} maxLength={200} onChange={(e) => setSubline(e.target.value)} className={inputClass} placeholder="e.g. ANGC Synapse · IT services & AI development" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="ad-cta">
                Button text <span className="font-normal text-muted">(shown when there is a link)</span>
              </label>
              <input id="ad-cta" value={ctaLabel} maxLength={40} onChange={(e) => setCtaLabel(e.target.value)} className={inputClass} placeholder="Learn more" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Colour</span>
              <div className="flex flex-wrap items-center gap-2.5">
                {(Object.keys(THEME_COLOURS) as (keyof typeof THEME_COLOURS)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    title={THEME_LABELS[key]}
                    aria-label={THEME_LABELS[key]}
                    onClick={() => setTheme(key)}
                    className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${theme === key ? 'border-orange ring-2 ring-orange/40' : 'border-white shadow'}`}
                    style={{ background: `linear-gradient(135deg, ${THEME_COLOURS[key][0]}, ${THEME_COLOURS[key][1]})` }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setTheme('custom')}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${theme === 'custom' ? 'border-orange bg-orange/10 text-orange' : 'border-card-border bg-white text-heading'}`}
                >
                  Custom
                </button>
              </div>
              {theme === 'custom' && (
                <div className="mt-1 flex items-center gap-3 text-xs text-muted">
                  <label className="flex items-center gap-2">
                    From
                    <input type="color" value={bgFrom} onChange={(e) => setBgFrom(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-card-border bg-white" />
                  </label>
                  <label className="flex items-center gap-2">
                    To
                    <input type="color" value={bgTo} onChange={(e) => setBgTo(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-card-border bg-white" />
                  </label>
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                <label className="flex items-center gap-2">
                  Button colour
                  <input
                    type="color"
                    value={ctaColor || defaultButtonColour(theme)}
                    onChange={(e) => setCtaColor(e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border border-card-border bg-white"
                  />
                </label>
                {ctaColor ? (
                  <button type="button" onClick={() => setCtaColor('')} className="font-semibold text-orange hover:underline">
                    Match the colour scheme
                  </button>
                ) : (
                  <span>matches the colour scheme</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className={labelClass}>Preview</span>
          <div className="overflow-hidden rounded-xl bg-[#f7f7f7] p-4">
            <AdPreview
              size={slotChoice || (placementChoices.find((o) => o.label === placement)?.slot ?? existingSlot ?? 'banner')}
              ad={{ template, imageUrl, headline, subline, ctaLabel, hasLink: Boolean(linkUrl.trim()), theme, bgFrom, bgTo, ctaColor }}
            />
          </div>
          <p className="text-xs text-muted">Drawn at the size chosen in “Ad size” above. On a phone the website shrinks it to fit.</p>
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
