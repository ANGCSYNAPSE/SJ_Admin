import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, ChevronDown, Search, SquarePen, Trash2 } from 'lucide-react'
import { deleteEvent, fetchEventRegistrationCount, fetchEvents } from '../../api/events'
import { apiErrorMessage } from '../../api/client'
import { formatDateTime } from '../../lib/format'
import { computeEventStatus } from '../../lib/eventStatus'
import { EventStatusBadge } from '../../components/events/EventStatusBadge'
import { EventsCalendar } from '../../components/events/EventsCalendar'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { EventItem } from '../../types/api'

export function Events() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventItem[]>([])
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'table' | 'calendar'>('table')
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchEvents()
      .then((items) => {
        if (cancelled) return
        setEvents(items)
        Promise.all(items.map((event) => fetchEventRegistrationCount(event.id).then((count) => [event.id, count] as const)))
          .then((pairs) => {
            if (cancelled) return
            setRegistrationCounts(Object.fromEntries(pairs))
          })
          .catch(() => {
            // Registration counts are a nice-to-have; the table still works without them.
          })
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load events.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const eventTypes = useMemo(() => Array.from(new Set(events.map((e) => e.type))).sort(), [events])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter((event) => {
      if (typeFilter !== 'all' && event.type !== typeFilter) return false
      if (q && !event.title.toLowerCase().includes(q) && !event.location.toLowerCase().includes(q)) return false
      return true
    })
  }, [events, search, typeFilter])

  async function confirmDelete() {
    if (!eventToDelete) return
    setIsDeleting(true)
    try {
      await deleteEvent(eventToDelete.id)
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id))
      setEventToDelete(null)
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to delete this event.'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted">Loading events…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex w-[220px] items-center gap-2 rounded-md border border-header-border bg-search-bg px-3 py-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full bg-transparent text-xs text-heading placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-md border border-header-border bg-search-bg py-2 pl-3 pr-8 text-xs text-heading focus:border-orange focus:outline-none"
            >
              <option value="all">Type: All Events</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  Type: {type}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setView((v) => (v === 'table' ? 'calendar' : 'table'))}
            title={view === 'table' ? 'Switch to calendar view' : 'Switch to table view'}
            aria-pressed={view === 'calendar'}
            className={`rounded-md border p-2.5 transition-colors ${
              view === 'calendar'
                ? 'border-orange bg-orange text-white'
                : 'border-header-border bg-search-bg text-heading hover:bg-white'
            }`}
          >
            <Calendar size={16} />
          </button>
          <Link
            to="/events/new"
            className="rounded-lg bg-orange px-4 py-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            Create New Event
          </Link>
        </div>
      </div>

      {view === 'calendar' ? (
        <EventsCalendar events={filtered} onSelectEvent={(event) => navigate(`/events/${event.id}/edit`)} />
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-card-border-alt bg-white">
          <div className="flex items-center bg-[#fcfaf2] px-6 py-3.5">
            <p className="flex-1 text-[11px] font-bold text-[#666]">EVENT NAME</p>
            <p className="w-[180px] shrink-0 text-[11px] font-bold text-[#666]">TYPE</p>
            <p className="w-40 shrink-0 text-[11px] font-bold text-[#666]">LOCATION</p>
            <p className="w-[140px] shrink-0 text-[11px] font-bold text-[#666]">DATE & TIME</p>
            <p className="w-[100px] shrink-0 text-[11px] font-bold text-[#666]">REGISTRATIONS</p>
            <p className="w-[100px] shrink-0 text-[11px] font-bold text-[#666]">STATUS</p>
            <p className="w-20 shrink-0 text-right text-[11px] font-bold text-[#666]">ACTIONS</p>
          </div>

          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">No events match these filters.</p>
          ) : (
            filtered.map((event) => (
              <div
                key={event.id}
                className="flex items-center border-b border-card-border-alt bg-[#fffdf9] px-6 py-3.5 last:border-b-0"
              >
                <p className="flex-1 truncate pr-4 text-xs font-semibold text-heading">{event.title}</p>
                <p className="w-[180px] shrink-0 truncate pr-2 text-xs text-body">{event.type}</p>
                <p className="w-40 shrink-0 truncate pr-2 text-xs text-muted">{event.location}</p>
                <p className="w-[140px] shrink-0 pr-2 text-xs text-body">{formatDateTime(event.startDate)}</p>
                <p className="w-[100px] shrink-0 text-xs font-semibold text-heading">
                  {registrationCounts[event.id] !== undefined ? registrationCounts[event.id].toLocaleString('en-IN') : '—'}
                </p>
                <div className="w-[100px] shrink-0">
                  <EventStatusBadge status={computeEventStatus(event)} />
                </div>
                <div className="flex w-20 shrink-0 items-center justify-end gap-2">
                  <Link to={`/events/${event.id}/edit`} title="Edit event" className="text-orange hover:text-orange-active">
                    <SquarePen size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setEventToDelete(event)}
                    title="Delete event"
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {eventToDelete && (
        <ConfirmDialog
          title="Delete Event?"
          description={`Are you sure you want to delete "${eventToDelete.title}"? This action cannot be undone.`}
          isConfirming={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setEventToDelete(null)}
        />
      )}
    </div>
  )
}
