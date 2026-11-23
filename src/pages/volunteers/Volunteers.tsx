import { Fragment, useCallback, useEffect, useState } from 'react'
import { BellRing, CheckCircle2, ChevronDown, Loader2, Search, XCircle } from 'lucide-react'
import {
  fetchVolunteers,
  reviewVolunteer,
  VOLUNTEER_INTERESTS,
  type VolunteerItem,
  type VolunteerList,
  type VolunteerStatus,
} from '../../api/volunteers'
import { apiErrorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { MessageDialog, type Recipient } from '../../components/registrations/MessageDialog'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'

const statusStyle: Record<VolunteerStatus, { label: string; cls: string }> = {
  pending: { label: 'New', cls: 'bg-[#fff9e6] text-[#b78103]' },
  approved: { label: 'Approved', cls: 'bg-[#eefbf3] text-[#1e7e34]' },
  rejected: { label: 'Not approved', cls: 'bg-[#fdf2f2] text-[#c0392b]' },
  blocked: { label: 'Paused', cls: 'bg-[#f1f1f1] text-[#6b6b6b]' },
}

const selectClass = 'appearance-none rounded-lg border border-card-border-alt bg-white py-2 pl-3.5 pr-9 text-[13px] text-body focus:border-orange focus:outline-none'

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border border-card-border-alt bg-white p-5">
      <p className="text-[12px] font-semibold uppercase text-muted">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  )
}

/**
 * The people who offered their time. Each has chosen the seva they would like to help with, so the admin can find, for
 * example, everyone in Jaipur who wants to help with food seva, approve them, and send them a message.
 */
export function Volunteers() {
  const toast = useToast()
  const [data, setData] = useState<VolunteerList | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<VolunteerStatus | ''>('')
  const [interest, setInterest] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [messaging, setMessaging] = useState<Recipient[] | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    fetchVolunteers({ status, interest, q })
      .then((d) => {
        if (cancelled) return
        setData(d)
        setError(null)
      })
      .catch((e) => !cancelled && setError(apiErrorMessage(e, 'Could not load the volunteers.')))
    return () => {
      cancelled = true
    }
  }, [status, interest, q, reload])

  const refresh = useCallback(() => setReload((n) => n + 1), [])

  async function review(item: VolunteerItem, next: VolunteerStatus) {
    setBusy(item.id)
    try {
      await reviewVolunteer(item.id, next, open === item.id && note.trim() ? note.trim() : undefined)
      toast.success(next === 'approved' ? `${item.fullName} is approved and has been told.` : 'Saved.')
      refresh()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not save.'))
    } finally {
      setBusy(null)
    }
  }

  if (!data && !error) return <Loader label="Loading volunteers…" />
  if (error && !data) return <p className="text-sm text-red-600">{error}</p>

  const counts = data?.counts ?? {}
  const items = data?.items ?? []
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-5">
        <Kpi label="All volunteers" value={total} tone="text-heading" />
        <Kpi label="New, to review" value={counts.pending ?? 0} tone="text-[#b78103]" />
        <Kpi label="Approved" value={counts.approved ?? 0} tone="text-[#1e7e34]" />
        <Kpi label="Not approved" value={counts.rejected ?? 0} tone="text-[#c0392b]" />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-card-border-alt bg-white p-5">
        <div className="flex w-64 items-center gap-2 rounded-lg border border-card-border-alt px-3.5 py-2">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city…"
            className="w-full bg-transparent text-[13px] text-heading placeholder:text-muted focus:outline-none"
          />
        </div>
        <div className="relative">
          <select value={status} onChange={(e) => setStatus(e.target.value as VolunteerStatus | '')} className={selectClass}>
            <option value="">Status: All</option>
            {(Object.keys(statusStyle) as VolunteerStatus[]).map((s) => (
              <option key={s} value={s}>
                Status: {statusStyle[s].label}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        <div className="relative">
          <select value={interest} onChange={(e) => setInterest(e.target.value)} className={selectClass}>
            <option value="">Seva: All</option>
            {VOLUNTEER_INTERESTS.map((s) => (
              <option key={s} value={s}>
                Seva: {s}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => setMessaging(items.map((i) => ({ userId: i.userId, name: i.fullName })))}
            className="ml-auto flex items-center gap-2 rounded-lg border border-orange px-4 py-2 text-[13px] font-semibold text-orange hover:bg-orange/5"
          >
            <BellRing size={14} />
            Message these {items.length}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-card-border-alt bg-white">
        <div className="flex items-center border-b border-card-border-alt bg-[#f5ede0] px-6 py-4 text-[13px] font-bold text-body">
          <p className="flex-1">VOLUNTEER</p>
          <p className="w-40 shrink-0">CITY</p>
          <p className="w-72 shrink-0">SEVA THEY CHOSE</p>
          <p className="w-32 shrink-0">CAN HELP</p>
          <p className="w-28 shrink-0">STATUS</p>
          <p className="w-48 shrink-0 text-right">ACTIONS</p>
        </div>

        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">{total === 0 ? 'No volunteers yet.' : 'No volunteers match these filters.'}</p>
        ) : (
          items.map((v, i) => (
            <Fragment key={v.id}>
              <div className={`flex items-center border-b border-card-border-alt px-6 py-3.5 ${i % 2 === 1 ? 'bg-search-bg' : 'bg-white'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(open === v.id ? null : v.id)
                    setNote(v.adminNote ?? '')
                  }}
                  className="flex-1 text-left"
                >
                  <p className="text-[13px] font-semibold text-heading">
                    {v.fullName}
                    {v.isMember && <span className="ml-2 rounded-md bg-[#e3f2fd] px-1.5 py-0.5 text-[10px] font-bold text-[#0d47a1]">MEMBER</span>}
                  </p>
                  <p className="text-[11px] text-muted">
                    {v.email} · {v.mobile}
                  </p>
                </button>
                <p className="w-40 shrink-0 pr-2 text-[13px] text-body">
                  {v.city}, {v.state}
                </p>
                <div className="flex w-72 shrink-0 flex-wrap gap-1 pr-2">
                  {v.interests.slice(0, 2).map((s) => (
                    <span key={s} className="rounded-full bg-[#fff1d8] px-2 py-0.5 text-[11px] font-semibold text-maroon">
                      {s}
                    </span>
                  ))}
                  {v.interests.length > 2 && <span className="text-[11px] text-muted">+{v.interests.length - 2} more</span>}
                </div>
                <p className="w-32 shrink-0 pr-2 text-[12px] text-body">{v.availability ?? '—'}</p>
                <div className="w-28 shrink-0">
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusStyle[v.status].cls}`}>{statusStyle[v.status].label}</span>
                </div>
                <div className="flex w-48 shrink-0 items-center justify-end gap-2">
                  {busy === v.id ? (
                    <Loader2 size={16} className="animate-spin text-orange" />
                  ) : (
                    <>
                      {v.status !== 'approved' && (
                        <button type="button" onClick={() => review(v, 'approved')} title="Approve" className="flex items-center gap-1 rounded-md bg-[#eefbf3] px-2.5 py-1.5 text-[12px] font-semibold text-[#1e7e34] hover:opacity-80">
                          <CheckCircle2 size={13} /> Approve
                        </button>
                      )}
                      {v.status !== 'rejected' && (
                        <button type="button" onClick={() => review(v, 'rejected')} title="Not approved" className="flex items-center gap-1 rounded-md bg-[#fdf2f2] px-2.5 py-1.5 text-[12px] font-semibold text-[#c0392b] hover:opacity-80">
                          <XCircle size={13} /> No
                        </button>
                      )}
                      <button type="button" onClick={() => setMessaging([{ userId: v.userId, name: v.fullName }])} title="Send a message" className="text-orange hover:opacity-70">
                        <BellRing size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {open === v.id && (
                <div className="grid gap-5 border-b border-card-border-alt bg-[#fffaf1] px-6 py-5 text-[13px] text-body md:grid-cols-2">
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase text-muted">All seva they chose</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {v.interests.map((s) => (
                          <span key={s} className="rounded-full bg-[#fff1d8] px-2.5 py-1 text-[11px] font-semibold text-maroon">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-muted">Skills</p>
                      <p className="mt-1">{v.skills.length ? v.skills.join(', ') : 'None given'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-muted">In their words</p>
                      <p className="mt-1">{v.about || 'Nothing added'}</p>
                    </div>
                    <p className="text-[11px] text-muted">
                      Registered {formatDate(v.createdAt)}
                      {v.reviewedAt && ` · last reviewed ${formatDate(v.reviewedAt)}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold uppercase text-muted" htmlFor={`note-${v.id}`}>
                      Private note (only the team sees this; saved with your next Approve or No)
                    </label>
                    <textarea
                      id={`note-${v.id}`}
                      value={note}
                      maxLength={500}
                      onChange={(e) => setNote(e.target.value)}
                      className="h-28 resize-none rounded-lg border border-card-border bg-white px-3 py-2 text-[13px] focus:border-orange focus:outline-none"
                      placeholder="For example: called on Monday, can help on Sundays."
                    />
                  </div>
                </div>
              )}
            </Fragment>
          ))
        )}
      </div>

      {messaging && (
        <MessageDialog
          recipients={messaging}
          initialKind="info"
          onClose={() => setMessaging(null)}
          onSent={(count) => {
            setMessaging(null)
            toast.success(`Message sent to ${count} ${count === 1 ? 'volunteer' : 'volunteers'}.`)
          }}
        />
      )}
    </div>
  )
}
