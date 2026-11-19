import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  BellRing,
  CalendarDays,
  HandHeart,
  Loader2,
  Megaphone,
  Newspaper,
  Search,
  Send,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchBroadcasts,
  previewAudience,
  sendBroadcast,
  type Audience,
  type AudiencePreview,
  type Broadcast,
  type NotificationCategory,
} from '../../api/notifications'
import { fetchEvents } from '../../api/events'
import { fetchBlogPosts } from '../../api/blog'
import { fetchUsers } from '../../api/users'
import { apiErrorMessage } from '../../api/client'
import { formatDateTime } from '../../lib/format'
import { typeLabel } from '../../lib/registrations'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'
import type { AdminUser, BlogPost, EventItem, NotificationKind, RegistrationType } from '../../types/api'

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

const categories: { value: NotificationCategory; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, hint: 'News for the community' },
  { value: 'event', label: 'Event', icon: CalendarDays, hint: 'Satsang, jagran, utsav' },
  { value: 'seva', label: 'Seva', icon: HandHeart, hint: 'Drives, donations, volunteering' },
  { value: 'update', label: 'Update', icon: Newspaper, hint: 'Blog, features, changes' },
  { value: 'registration', label: 'Registration', icon: BadgeCheck, hint: 'About their profile or fee' },
]

const kinds: { value: NotificationKind; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Good news' },
  { value: 'warning', label: 'Needs attention' },
]

/** Ready-made starting points; the admin edits the words before sending. */
const templates: { label: string; category: NotificationCategory; kind: NotificationKind; title: string; message: string; link: string }[] = [
  {
    label: 'Event invitation',
    category: 'event',
    kind: 'info',
    title: 'You are invited',
    message: 'Jai Shri Shyam! Join us for our upcoming programme. Come with family and take part in the bhajan and seva. Details inside.',
    link: '/events',
  },
  {
    label: 'Seva drive',
    category: 'seva',
    kind: 'info',
    title: 'Seva drive this week',
    message: 'Be part of this week’s seva. Every small contribution reaches those who need it. Tap to see how you can help.',
    link: '/initiatives',
  },
  {
    label: 'Festival greeting',
    category: 'announcement',
    kind: 'success',
    title: 'Jai Shri Shyam',
    message: 'Warm wishes to you and your family on this auspicious day from everyone at Shyam Jagat. May Baba Shyam bless you.',
    link: '',
  },
  {
    label: 'Complete your fee',
    category: 'registration',
    kind: 'warning',
    title: 'Registration fee pending',
    message: 'Your registration fee is not complete yet. Please complete it from your profile so your listing can go live.',
    link: '/profile',
  },
  {
    label: 'Finish your profile',
    category: 'registration',
    kind: 'warning',
    title: 'A few details are missing',
    message: 'Your registration still has details to fill in. It only takes a minute and helps people find you.',
    link: '/complete-profile',
  },
  {
    label: 'New on the website',
    category: 'update',
    kind: 'info',
    title: 'Something new for you',
    message: 'We have added something new on Shyam Jagat. Take a look and tell us what you think.',
    link: '/blog',
  },
]

const staticLinks = [
  { value: '', label: 'No link' },
  { value: '/events', label: 'Events page' },
  { value: '/initiatives', label: 'Initiatives' },
  { value: '/donation', label: 'Donation page' },
  { value: '/blog', label: 'Blog' },
  { value: '/profile', label: 'My profile (pay the fee)' },
  { value: '/complete-profile', label: 'Complete-profile page' },
  { value: '/', label: 'Home page' },
]

type AudienceMode = 'all' | 'segment' | 'users'
type Segment = { fee: '' | 'paid' | 'partial' | 'unpaid'; categories: RegistrationType[]; profile: '' | 'incomplete' | 'complete'; registration: '' | 'none' | 'any'; verified: '' | 'yes' | 'no' }
const emptySegment: Segment = { fee: '', categories: [], profile: '', registration: '', verified: '' }

const categoryList = Object.keys(typeLabel) as RegistrationType[]

function buildAudience(mode: AudienceMode, segment: Segment, people: AdminUser[]): Audience | null {
  if (mode === 'all') return { mode: 'all' }
  if (mode === 'users') return people.length ? { mode: 'users', userIds: people.map((p) => p.id) } : null
  const s: Extract<Audience, { mode: 'segment' }>['segment'] = {}
  if (segment.fee) s.fee = segment.fee
  if (segment.categories.length) s.categories = segment.categories
  if (segment.profile) s.profile = segment.profile
  if (segment.registration) s.registration = segment.registration
  if (segment.verified) s.verified = segment.verified
  return Object.keys(s).length ? { mode: 'segment', segment: s } : null
}

function describeAudience(a: Audience, names?: Record<string, string>): string {
  if (a.mode === 'all') return 'Everyone'
  if (a.mode === 'users') {
    const shown = a.userIds.slice(0, 2).map((id) => names?.[id] ?? 'a member')
    return `${a.userIds.length} chosen ${a.userIds.length === 1 ? 'person' : 'people'}${names ? ` (${shown.join(', ')}${a.userIds.length > 2 ? ', …' : ''})` : ''}`
  }
  const s = a.segment
  const parts: string[] = []
  if (s.fee) parts.push(s.fee === 'paid' ? 'fee paid in full' : s.fee === 'partial' ? 'fee part-paid' : 'fee unpaid')
  if (s.categories?.length) parts.push(`registered as ${s.categories.map((c) => typeLabel[c].toLowerCase()).join(' / ')}`)
  if (s.profile) parts.push(s.profile === 'incomplete' ? 'profile incomplete' : 'profile complete')
  if (s.registration) parts.push(s.registration === 'none' ? 'plain members' : 'any registration')
  if (s.verified) parts.push(s.verified === 'yes' ? 'verified by admin' : 'not verified by admin')
  return parts.join(', ')
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? 'border-orange bg-orange text-white' : 'border-card-border bg-white text-heading hover:border-orange/60'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-heading">
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </p>
      {children}
    </div>
  )
}

/** Choose specific people: type to search, click to add. */
function PeoplePicker({ chosen, onChange }: { chosen: AdminUser[]; onChange: (people: AdminUser[]) => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [query, setQuery] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => setFailed(true))
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !users) return []
    const taken = new Set(chosen.map((c) => c.id))
    return users
      .filter((u) => !taken.has(u.id) && `${u.fullName} ${u.email} ${u.mobile}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, users, chosen])

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} pl-9`}
          placeholder={users ? 'Search by name, email or mobile…' : failed ? 'Could not load people' : 'Loading people…'}
          disabled={!users}
        />
        {matches.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-card-border bg-white shadow-lg">
            {matches.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onChange([...chosen, u])
                  setQuery('')
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[13px] hover:bg-search-bg"
              >
                <span className="font-semibold text-heading">{u.fullName}</span>
                <span className="truncate text-muted">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {chosen.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chosen.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5 rounded-full bg-[#fff1e6] py-1 pl-3 pr-2 text-[13px] font-medium text-heading">
              {u.fullName}
              <button type="button" aria-label={`Remove ${u.fullName}`} onClick={() => onChange(chosen.filter((c) => c.id !== u.id))} className="text-muted hover:text-heading">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Compose({ onSent }: { onSent: () => void }) {
  const toast = useToast()
  const [category, setCategory] = useState<NotificationCategory>('announcement')
  const [kind, setKind] = useState<NotificationKind>('info')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [linkSource, setLinkSource] = useState<'preset' | 'event' | 'blog' | 'custom'>('preset')

  const [mode, setMode] = useState<AudienceMode>('all')
  const [segment, setSegment] = useState<Segment>(emptySegment)
  const [people, setPeople] = useState<AdminUser[]>([])

  const [events, setEvents] = useState<EventItem[] | null>(null)
  const [posts, setPosts] = useState<BlogPost[] | null>(null)

  const [preview, setPreview] = useState<AudiencePreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audience = useMemo(() => buildAudience(mode, segment, people), [mode, segment, people])

  // "This will reach N people", worked out by the server as the choices change.
  useEffect(() => {
    if (!audience) {
      setPreview(null)
      return
    }
    setPreviewing(true)
    let stale = false
    const timer = window.setTimeout(() => {
      previewAudience(audience)
        .then((p) => !stale && setPreview(p))
        .catch(() => !stale && setPreview(null))
        .finally(() => !stale && setPreviewing(false))
    }, 350)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [audience])

  useEffect(() => {
    if (linkSource === 'event' && !events) fetchEvents().then(setEvents).catch(() => setEvents([]))
    if (linkSource === 'blog' && !posts) fetchBlogPosts().then(setPosts).catch(() => setPosts([]))
  }, [linkSource, events, posts])

  function applyTemplate(t: (typeof templates)[number]) {
    setCategory(t.category)
    setKind(t.kind)
    setTitle(t.title)
    setMessage(t.message)
    setLink(t.link)
    setLinkSource(staticLinks.some((l) => l.value === t.link) ? 'preset' : 'custom')
    if (t.category === 'registration' && t.label === 'Complete your fee') {
      setMode('segment')
      setSegment({ ...emptySegment, fee: 'unpaid' })
    }
    if (t.label === 'Finish your profile') {
      setMode('segment')
      setSegment({ ...emptySegment, profile: 'incomplete' })
    }
  }

  const canSend = message.trim() !== '' && audience !== null && (preview?.count ?? 0) > 0

  async function send() {
    if (!audience) return
    setSending(true)
    setError(null)
    try {
      const result = await sendBroadcast({
        audience,
        message: message.trim(),
        title: title.trim() || undefined,
        kind,
        category,
        link: link || undefined,
      })
      toast.success(result.message)
      setConfirming(false)
      setTitle('')
      setMessage('')
      setLink('')
      setLinkSource('preset')
      onSent()
    } catch (err) {
      setConfirming(false)
      setError(apiErrorMessage(err, 'Could not send the message.'))
    } finally {
      setSending(false)
    }
  }

  const CategoryIcon = categories.find((c) => c.value === category)?.icon ?? Megaphone

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-card-border-alt bg-white p-5">
          <p className="font-display text-lg font-bold text-maroon">1. Write the message</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Start from:</span>
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => applyTemplate(t)}
                className="flex items-center gap-1 rounded-full border border-dashed border-orange/60 px-3 py-1 text-[12px] font-medium text-orange hover:bg-[#fff1e6]"
              >
                <Sparkles size={12} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-5">
            <Field label="What is it about?">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {categories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-center transition-colors ${
                      category === c.value ? 'border-orange bg-[#fff1e6]' : 'border-card-border hover:border-orange/50'
                    }`}
                  >
                    <c.icon size={18} className={category === c.value ? 'text-orange' : 'text-muted'} />
                    <span className="text-[12px] font-semibold text-heading">{c.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Tone">
              <div className="flex flex-wrap gap-2">
                {kinds.map((k) => (
                  <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
                    {k.label}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Title" hint="(optional)">
              <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Shyam Jayanti satsang this Sunday" />
            </Field>

            <Field label="Message" hint={`${message.length}/500`}>
              <textarea value={message} maxLength={500} rows={4} onChange={(e) => setMessage(e.target.value)} className={`${inputClass} resize-none`} placeholder="Write what you want devotees to know…" />
            </Field>

            <Field label="Where should it take them?" hint="(optional)">
              <div className="flex flex-wrap gap-2">
                {(['preset', 'event', 'blog', 'custom'] as const).map((s) => (
                  <Chip
                    key={s}
                    active={linkSource === s}
                    onClick={() => {
                      setLinkSource(s)
                      if (s !== 'custom') setLink('')
                    }}
                  >
                    {s === 'preset' ? 'A page' : s === 'event' ? 'An event' : s === 'blog' ? 'A blog post' : 'Custom path'}
                  </Chip>
                ))}
              </div>
              {linkSource === 'preset' && (
                <select value={link} onChange={(e) => setLink(e.target.value)} className={inputClass}>
                  {staticLinks.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
              {linkSource === 'event' && (
                <select value={link} onChange={(e) => setLink(e.target.value)} className={inputClass} disabled={!events}>
                  <option value="">{events ? (events.length ? 'Choose an event…' : 'No events yet') : 'Loading events…'}</option>
                  {events?.filter((e) => e.slug).map((e) => (
                    <option key={e.id} value={`/events/${e.slug}`}>
                      {e.title}
                    </option>
                  ))}
                </select>
              )}
              {linkSource === 'blog' && (
                <select value={link} onChange={(e) => setLink(e.target.value)} className={inputClass} disabled={!posts}>
                  <option value="">{posts ? (posts.length ? 'Choose a post…' : 'No posts yet') : 'Loading posts…'}</option>
                  {posts?.filter((p) => p.isPublished).map((p) => (
                    <option key={p.id} value={`/blog/${p.slug}`}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
              {linkSource === 'custom' && (
                <input value={link} onChange={(e) => setLink(e.target.value)} className={inputClass} placeholder="/events/diwali-seva  (a path inside the website)" />
              )}
            </Field>
          </div>
        </section>

        <section className="rounded-xl border border-card-border-alt bg-white p-5">
          <p className="font-display text-lg font-bold text-maroon">2. Choose who receives it</p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {(
              [
                ['all', 'Everyone', 'Every devotee on the website'],
                ['segment', 'A group', 'Filter by fee, registration or profile'],
                ['users', 'Specific people', 'Pick them by name'],
              ] as const
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${mode === value ? 'border-orange bg-[#fff1e6]' : 'border-card-border hover:border-orange/50'}`}
              >
                <p className="text-sm font-semibold text-heading">{label}</p>
                <p className="text-[12px] text-muted">{hint}</p>
              </button>
            ))}
          </div>

          {mode === 'segment' && (
            <div className="mt-5 flex flex-col gap-5">
              <Field label="Registration fee">
                <div className="flex flex-wrap gap-2">
                  {([['', 'Any'], ['paid', 'Paid in full'], ['partial', 'Part-paid'], ['unpaid', 'Not paid']] as const).map(([v, l]) => (
                    <Chip key={v} active={segment.fee === v} onClick={() => setSegment({ ...segment, fee: v })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Registered as" hint="(pick any)">
                <div className="flex flex-wrap gap-2">
                  {categoryList.map((c) => (
                    <Chip
                      key={c}
                      active={segment.categories.includes(c)}
                      onClick={() =>
                        setSegment({
                          ...segment,
                          categories: segment.categories.includes(c) ? segment.categories.filter((x) => x !== c) : [...segment.categories, c],
                        })
                      }
                    >
                      {typeLabel[c]}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Profile">
                <div className="flex flex-wrap gap-2">
                  {([['', 'Any'], ['incomplete', 'Details missing'], ['complete', 'Complete']] as const).map(([v, l]) => (
                    <Chip key={v} active={segment.profile === v} onClick={() => setSegment({ ...segment, profile: v })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Has a registration?">
                <div className="flex flex-wrap gap-2">
                  {([['', 'Either'], ['any', 'Registered in a category'], ['none', 'Plain members only']] as const).map(([v, l]) => (
                    <Chip key={v} active={segment.registration === v} onClick={() => setSegment({ ...segment, registration: v })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              <Field label="Admin verification">
                <div className="flex flex-wrap gap-2">
                  {([['', 'Either'], ['no', 'Not verified yet'], ['yes', 'Verified']] as const).map(([v, l]) => (
                    <Chip key={v} active={segment.verified === v} onClick={() => setSegment({ ...segment, verified: v })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </Field>
              {!audience && <p className="text-[13px] text-muted">Choose at least one filter, or send to everyone.</p>}
            </div>
          )}

          {mode === 'users' && (
            <div className="mt-5">
              <PeoplePicker chosen={people} onChange={setPeople} />
            </div>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:self-start">
        <section className="rounded-xl border border-card-border-alt bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">How it will look</p>
          <div className="mt-3 flex gap-3 rounded-xl border border-card-border bg-[#fffbf3] p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fde9c8] text-[#b45309]">
              <CategoryIcon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-maroon">{title.trim() || categories.find((c) => c.value === category)?.label}</p>
              <p className="mt-0.5 line-clamp-3 text-[13px] text-body">{message.trim() || 'Your message appears here.'}</p>
              <p className="mt-1 text-[11px] text-muted">just now{link ? ` · opens ${link}` : ''}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-card-border-alt bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Reach</p>
          {!audience ? (
            <p className="mt-2 text-sm text-body">{mode === 'users' ? 'Pick at least one person.' : 'Choose at least one filter.'}</p>
          ) : previewing && !preview ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-body">
              <Loader2 size={14} className="animate-spin" /> Counting…
            </p>
          ) : preview ? (
            <>
              <p className="mt-1 text-3xl font-bold text-heading">{preview.count.toLocaleString('en-IN')}</p>
              <p className="text-[13px] text-body">{preview.count === 1 ? 'person will' : 'people will'} be notified</p>
              {preview.sample.length > 0 && (
                <p className="mt-2 text-[12px] text-muted">
                  e.g. {preview.sample.join(', ')}
                  {preview.count > preview.sample.length ? ' …' : ''}
                </p>
              )}
              {preview.capped && <p className="mt-2 text-[12px] text-amber-700">Large audience: only the first {preview.count.toLocaleString('en-IN')} will receive it.</p>}
              {preview.count === 0 && <p className="mt-2 text-[12px] text-amber-700">Nobody matches this group yet.</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-body">Could not count the audience.</p>
          )}
          {mode !== 'users' && <p className="mt-2 text-[11px] text-muted">Admins and blocked accounts are never included.</p>}

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}

          <button
            type="button"
            disabled={!canSend}
            onClick={() => setConfirming(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send size={16} /> Review &amp; send
          </button>
        </section>
      </aside>

      {confirming && audience && preview && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-tint">
                <BellRing size={20} className="text-orange" />
              </div>
              <div>
                <p className="font-display text-xl font-bold text-maroon">Send to {preview.count.toLocaleString('en-IN')} {preview.count === 1 ? 'person' : 'people'}?</p>
                <p className="text-[13px] text-body">{describeAudience(audience, Object.fromEntries(people.map((p) => [p.id, p.fullName])))}</p>
              </div>
            </div>
            <div className="rounded-lg bg-search-bg p-3 text-[13px] text-body">
              {title.trim() && <p className="font-semibold text-heading">{title.trim()}</p>}
              <p>{message.trim()}</p>
            </div>
            <p className="text-[12px] text-muted">It appears in each person&apos;s notification bell right away and can&apos;t be unsent.</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirming(false)} disabled={sending} className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-heading">
                Go back
              </button>
              <button type="button" onClick={send} disabled={sending} className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {sending && <Loader2 size={14} className="animate-spin" />} Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function History({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Broadcast[] | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    setFailed(false)
    fetchBroadcasts().then(setRows).catch(() => setFailed(true))
  }, [])

  useEffect(load, [load, refreshKey])

  if (failed) return <p className="py-10 text-center text-sm text-body">Could not load the history. <button type="button" onClick={load} className="font-semibold text-orange">Try again</button></p>
  if (!rows) return <Loader />
  if (rows.length === 0) return <p className="rounded-xl border border-card-border-alt bg-white py-14 text-center text-sm text-body">Nothing sent yet. Compose your first message.</p>

  return (
    <div className="overflow-x-auto rounded-xl border border-card-border-alt bg-white">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="border-b border-card-border-alt text-[11px] uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Message</th>
            <th className="px-4 py-3">To</th>
            <th className="px-4 py-3">Delivered</th>
            <th className="px-4 py-3">Read</th>
            <th className="px-4 py-3">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const pct = b.recipients ? Math.round((b.read / b.recipients) * 100) : 0
            return (
              <tr key={b.id} className="border-b border-card-border-alt last:border-0 align-top">
                <td className="max-w-[340px] px-4 py-3">
                  <p className="font-semibold text-heading">{b.title ?? categories.find((c) => c.value === b.category)?.label ?? b.category}</p>
                  <p className="line-clamp-2 text-body">{b.message}</p>
                  {b.link && <p className="mt-0.5 text-[11px] text-muted">opens {b.link}</p>}
                </td>
                <td className="px-4 py-3 text-body">{describeAudience(b.audience)}</td>
                <td className="px-4 py-3 font-semibold text-heading">{b.recipients.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-heading">{b.read.toLocaleString('en-IN')}</p>
                  <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-orange" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-muted">{pct}%</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-body">
                  {formatDateTime(b.createdAt)}
                  {b.createdBy && <p className="text-[11px] text-muted">by {b.createdBy}</p>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Notification centre: write a message, choose who gets it, and see how many read it. */
export function Notifications() {
  const [tab, setTab] = useState<'compose' | 'sent'>('compose')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 border-b border-card-border-alt">
        {([['compose', 'Send a notification'], ['sent', 'Sent history']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${tab === id ? 'border-orange text-orange' : 'border-transparent text-body hover:text-heading'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'compose' ? (
        <Compose
          onSent={() => {
            setRefreshKey((k) => k + 1)
            setTab('sent')
          }}
        />
      ) : (
        <History refreshKey={refreshKey} />
      )}
    </div>
  )
}
