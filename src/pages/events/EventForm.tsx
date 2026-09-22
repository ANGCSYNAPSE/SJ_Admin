import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, Loader2, UploadCloud, X } from 'lucide-react'
import { createEvent, fetchEvent, updateEvent, type EventInput } from '../../api/events'
import { uploadFile } from '../../api/uploads'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { slugify } from '../../lib/slug'
import { stripHtml } from '../../lib/html'
import { RichTextEditor } from '../../components/ui/RichTextEditor'
import { TagInput } from '../../components/ui/TagInput'
import type { EventItem } from '../../types/api'

const labelClass = 'text-[13px] font-semibold text-heading'
const requiredMark = <span className="text-[#dc3545]">*</span>
const inputClass =
  'w-full rounded-lg border border-card-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-orange focus:outline-none'

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-5 rounded-2xl border border-header-border bg-white p-6 shadow-[0_6px_8px_rgba(61,16,16,0.04)]">
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-heading">{title}</p>
        <p className="text-[13px] text-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

/** ISO string -> the local "YYYY-MM-DDTHH:mm" value a datetime-local input needs. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toIso(localValue: string): string {
  return new Date(localValue).toISOString()
}

export function EventForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [isLoading, setIsLoading] = useState(isEdit)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [registrationLimit, setRegistrationLimit] = useState('')

  const [description, setDescription] = useState('')
  const [image, setImage] = useState<string | null>(null)

  const [organizerName, setOrganizerName] = useState('')
  const [contactNumber, setContactNumber] = useState('')

  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [focusKeywords, setFocusKeywords] = useState<string[]>([])
  const [isIndexed, setIsIndexed] = useState(true)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [submittingAction, setSubmittingAction] = useState<'publish' | 'draft' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false

    fetchEvent(id)
      .then((found) => {
        if (cancelled) return
        setEvent(found)
        setTitle(found.title)
        setType(found.type)
        setLocation(found.location)
        setVenueAddress(found.venueAddress ?? '')
        setStartDate(toLocalInputValue(found.startDate))
        setEndDate(toLocalInputValue(found.endDate))
        setRegistrationLimit(found.registrationLimit != null ? String(found.registrationLimit) : '')
        setDescription(found.description)
        setImage(found.image)
        setOrganizerName(found.organizerName ?? '')
        setContactNumber(found.contactNumber ?? '')
        setSlug(found.slug ?? '')
        setMetaTitle(found.metaTitle ?? '')
        setMetaDescription(found.metaDescription ?? '')
        setFocusKeywords(found.focusKeywords)
        setIsIndexed(found.isIndexed)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load this event.')))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function handleFile(file: File) {
    setIsUploading(true)
    setError(null)
    try {
      const uploaded = await uploadFile(file)
      setImage(uploaded.url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload image.'))
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

  async function submit(publish: boolean) {
    setError(null)

    if (!title.trim()) return setError('Event name is required.')
    if (!type.trim()) return setError('Event type is required.')
    if (!location.trim()) return setError('Location is required.')
    if (!startDate) return setError('Start date & time is required.')
    if (!endDate) return setError('End date & time is required.')
    if (new Date(endDate) < new Date(startDate)) return setError('End date must be after the start date.')
    if (!stripHtml(description)) return setError('Description is required.')

    setSubmittingAction(publish ? 'publish' : 'draft')
    try {
      const payload: EventInput = {
        title: title.trim(),
        description,
        location: location.trim(),
        venueAddress: venueAddress.trim() || undefined,
        startDate: toIso(startDate),
        endDate: toIso(endDate),
        type: type.trim(),
        registrationLimit: registrationLimit ? Number(registrationLimit) : undefined,
        organizerName: organizerName.trim() || undefined,
        contactNumber: contactNumber.trim() || undefined,
        image: image ?? undefined,
        slug: slug || slugify(title),
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        focusKeywords,
        isIndexed,
        isPublished: publish,
      }

      if (isEdit && event) {
        await updateEvent(event.id, payload)
      } else {
        await createEvent(payload)
      }
      navigate('/events')
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save this event.'))
    } finally {
      setSubmittingAction(null)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading event…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Event Details" description="Core information, timing, and capacity details for the event.">
        <div className="flex flex-col gap-1.5">
          <label className={`flex items-center gap-1 ${labelClass}`} htmlFor="event-title">
            Event Name {requiredMark}
          </label>
          <input
            id="event-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className={inputClass}
            placeholder="e.g. Phalguna Mela Grand Bhajan Sandhya"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={`flex items-center gap-1 ${labelClass}`} htmlFor="event-type">
              Event Type {requiredMark}
            </label>
            <input
              id="event-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
              placeholder="Select Event Type"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={`flex items-center gap-1 ${labelClass}`} htmlFor="event-location">
              Location {requiredMark}
            </label>
            <input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="e.g. Khatu Dham, Sikar"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="event-venue">
            Venue Address
          </label>
          <textarea
            id="event-venue"
            value={venueAddress}
            onChange={(e) => setVenueAddress(e.target.value)}
            rows={3}
            className={`${inputClass} h-[100px] resize-none`}
            placeholder="Provide complete physical address and landmark details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={`flex items-center gap-1 ${labelClass}`} htmlFor="event-start">
              Date &amp; Time - Start {requiredMark}
            </label>
            <input
              id="event-start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={`flex items-center gap-1 ${labelClass}`} htmlFor="event-end">
              Date &amp; Time - End {requiredMark}
            </label>
            <input
              id="event-end"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="event-limit">
            Registration Limit
          </label>
          <input
            id="event-limit"
            type="number"
            min={1}
            value={registrationLimit}
            onChange={(e) => setRegistrationLimit(e.target.value)}
            className={inputClass}
            placeholder="e.g. 5000 (leave blank for unlimited)"
          />
        </div>
      </SectionCard>

      <SectionCard title="Description & Media" description="Rich description and featured image for the event listing.">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Description</label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Provide event program breakdown, spiritual significance, and general guidelines..."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Featured Image</span>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${
              isDragging ? 'border-orange bg-orange/5' : 'border-card-border bg-search-bg'
            }`}
          >
            {image ? (
              <>
                <img src={resolveUploadUrl(image) ?? undefined} alt="" className="h-32 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white text-heading shadow"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                {isUploading ? (
                  <Loader2 size={22} className="animate-spin text-orange" />
                ) : (
                  <UploadCloud size={22} className="text-orange" />
                )}
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
                          accept="image/*"
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
                <p className="text-[11px] text-muted">PNG, JPG or WEBP up to 5MB (Recommended: 1200x630px)</p>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Organizer & Contact" description="Public-facing organizer details and contact information.">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="event-organizer">
              Organizer Name
            </label>
            <input
              id="event-organizer"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Shree Shyam Committee"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="event-contact">
              Contact Number
            </label>
            <input
              id="event-contact"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className={inputClass}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="SEO & Meta Information" description="Search engine optimization metadata for the event page.">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="event-meta-title">
            Meta Title
          </label>
          <input
            id="event-meta-title"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value.slice(0, 60))}
            className={inputClass}
            placeholder="e.g. Phalguna Mela Grand Bhajan Sandhya"
          />
          <p className="text-[11px] text-muted">{metaTitle.length} / 60</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="event-meta-description">
            Meta Description
          </label>
          <textarea
            id="event-meta-description"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value.slice(0, 160))}
            rows={4}
            className={`${inputClass} h-24 resize-none`}
            placeholder="Briefly describe the event, its spiritual significance, and what attendees can expect..."
          />
          <p className="text-[11px] text-muted">{metaDescription.length} / 160</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Focus Keywords</label>
          <TagInput tags={focusKeywords} onChange={setFocusKeywords} placeholder="Add keyword" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="event-slug">
            URL Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-[13px] text-maroon">
              shyamjagat.com/events/
            </span>
            <input
              id="event-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              className={`${inputClass} flex-1`}
              placeholder="phalguna-mela-grand-bhajan-sandhya"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 text-[13px] text-heading">
          <button
            type="button"
            onClick={() => setIsIndexed((v) => !v)}
            aria-pressed={isIndexed}
            className={`flex size-5 shrink-0 items-center justify-center rounded-md ${isIndexed ? 'bg-orange' : 'border border-card-border bg-white'}`}
          >
            {isIndexed && <Check size={12} className="text-white" />}
          </button>
          Index this page on search engines
        </label>
      </SectionCard>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={submittingAction !== null || isUploading}
          onClick={() => submit(true)}
          className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {submittingAction === 'publish' && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Save Changes' : 'Create Event'}
        </button>
        <button
          type="button"
          disabled={submittingAction !== null || isUploading}
          onClick={() => submit(false)}
          className="flex items-center gap-2 rounded-lg border border-header-border bg-search-bg px-6 py-3 text-sm font-semibold text-heading transition-colors hover:bg-white disabled:opacity-60"
        >
          {submittingAction === 'draft' && <Loader2 size={14} className="animate-spin" />}
          Save as Draft
        </button>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="text-sm font-semibold text-maroon hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
