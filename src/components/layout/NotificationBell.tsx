import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, BadgeCheck, HandCoins, HeartHandshake, Mail, UserPlus, FileText, type LucideIcon } from 'lucide-react'
import { fetchActivity, type Activity, type ActivityKind } from '../../api/activity'
import { formatRelativeTime } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'

const POLL_MS = 60_000

const icons: Record<ActivityKind, { Icon: LucideIcon; tint: string }> = {
  signup: { Icon: UserPlus, tint: 'bg-sky-100 text-sky-700' },
  registration: { Icon: FileText, tint: 'bg-violet-100 text-violet-700' },
  payment: { Icon: HandCoins, tint: 'bg-green-100 text-green-700' },
  donation: { Icon: HeartHandshake, tint: 'bg-rose-100 text-rose-700' },
  message: { Icon: Mail, tint: 'bg-amber-100 text-amber-700' },
}

/**
 * The admin's bell: what happened on the website (new members, registrations to review, payments, donations,
 * messages) and what is waiting for the admin. "New" is what arrived since this admin last opened the bell.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [failed, setFailed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const storageKey = `ssj-admin-bell-seen:${user?.id ?? 'admin'}`
  const readSeen = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      // First time on this browser: treat the last day as new, so nothing important is silently skipped.
      return raw ? Number(raw) : Date.now() - 24 * 3_600_000
    } catch {
      return Date.now() - 24 * 3_600_000
    }
  }, [storageKey])
  const [seen, setSeen] = useState(readSeen)

  const load = useCallback(() => {
    fetchActivity()
      .then((a) => {
        setActivity(a)
        setFailed(false)
      })
      .catch(() => setFailed(true))
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !rootRef.current?.contains(e.target as Node) && closeAndMarkSeen()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeAndMarkSeen()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function closeAndMarkSeen() {
    setOpen(false)
    const now = Date.now()
    try {
      localStorage.setItem(storageKey, String(now))
    } catch {
      /* the badge simply comes back next visit */
    }
    setSeen(now)
  }

  const items = activity?.items ?? []
  const fresh = items.filter((i) => new Date(i.at).getTime() > seen)
  const attention = activity ? activity.attention.registrations + activity.attention.unverified + activity.attention.messages : 0
  const badge = fresh.length

  const waiting = activity
    ? [
        { n: activity.attention.registrations, label: 'registrations to review', to: '/registrations' },
        { n: activity.attention.unverified, label: 'accounts to verify', to: '/verification' },
        { n: activity.attention.messages, label: 'unanswered messages', to: '/contact-inquiries' },
      ].filter((w) => w.n > 0)
    : []

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (open ? closeAndMarkSeen() : setOpen(true))}
        className="relative text-heading"
        aria-label={badge > 0 ? `Notifications, ${badge} new` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {badge > 0 ? (
          <span className="absolute -right-2 -top-2 flex min-w-[18px] items-center justify-center rounded-full bg-orange px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : attention > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-orange/60 ring-2 ring-white" />
        ) : null}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-xl border border-card-border bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-card-border-alt px-4 py-3">
            <p className="font-display text-base font-bold text-maroon">Notifications</p>
            {fresh.length > 0 && <span className="rounded-full bg-orange px-2 py-0.5 text-[11px] font-bold text-white">{fresh.length} new</span>}
          </div>

          {waiting.length > 0 && (
            <div className="border-b border-card-border-alt bg-[#fff8ec] px-4 py-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Waiting for you</p>
              <div className="flex flex-col gap-1">
                {waiting.map((w) => (
                  <Link key={w.to} to={w.to} onClick={closeAndMarkSeen} className="flex items-center justify-between text-[13px] text-heading hover:text-orange">
                    <span>
                      <b>{w.n}</b> {w.label}
                    </span>
                    <span aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto">
            {failed && !activity && <p className="px-4 py-8 text-center text-[13px] text-body">Could not load. <button type="button" onClick={load} className="font-semibold text-orange">Try again</button></p>}
            {!activity && !failed && <p className="px-4 py-8 text-center text-[13px] text-muted">Loading…</p>}
            {activity && items.length === 0 && (
              <div className="px-6 py-10 text-center">
                <BadgeCheck className="mx-auto text-green-600" size={28} />
                <p className="mt-2 text-sm font-semibold text-heading">All quiet</p>
                <p className="text-[12px] text-muted">New members, registrations and payments will show up here.</p>
              </div>
            )}
            {items.map((item) => {
              const { Icon, tint } = icons[item.kind]
              const isNew = new Date(item.at).getTime() > seen
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    closeAndMarkSeen()
                    navigate(item.link)
                  }}
                  className={`flex w-full gap-3 border-b border-card-border-alt px-4 py-3 text-left last:border-0 hover:bg-search-bg ${isNew ? 'bg-[#fffbf3]' : ''}`}
                >
                  <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${tint}`}>
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[13px] text-heading ${isNew ? 'font-bold' : 'font-medium'}`}>{item.title}</span>
                    <span className="block truncate text-[12px] text-body">{item.detail}</span>
                    <span className="block text-[11px] text-muted">{formatRelativeTime(item.at)}</span>
                  </span>
                  {isNew && <span className="mt-2 size-2 shrink-0 rounded-full bg-orange" />}
                </button>
              )
            })}
          </div>

          <Link to="/notifications" onClick={closeAndMarkSeen} className="block border-t border-card-border-alt bg-search-bg px-4 py-3 text-center text-[13px] font-semibold text-orange hover:bg-[#fde9c8]">
            Send a notification to devotees
          </Link>
        </div>
      )}
    </div>
  )
}
