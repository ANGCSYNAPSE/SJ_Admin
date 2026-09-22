import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buildMonthGrid, dateKey } from '../../lib/calendar'
import { computeEventStatus, type EventStatus } from '../../lib/eventStatus'
import type { EventItem } from '../../types/api'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const chipStyles: Record<EventStatus, string> = {
  draft: 'bg-[#fff9e6] text-[#d39e00]',
  upcoming: 'bg-orange/10 text-orange',
  live: 'bg-success/10 text-success',
  completed: 'bg-muted/10 text-muted',
}

interface EventsCalendarProps {
  events: EventItem[]
  onSelectEvent: (event: EventItem) => void
}

export function EventsCalendar({ events, onSelectEvent }: EventsCalendarProps) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>()
    for (const event of events) {
      const key = dateKey(new Date(event.startDate))
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  function goToMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function goToToday() {
    const now = new Date()
    setCursor({ year: now.getFullYear(), month: now.getMonth() })
  }

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="w-full overflow-hidden rounded-xl border border-card-border-alt bg-white">
      <div className="flex items-center justify-between border-b border-card-border-alt px-6 py-4">
        <p className="font-display text-lg font-bold text-maroon">{monthLabel}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-md border border-header-border px-3 py-1.5 text-xs font-semibold text-heading hover:bg-search-bg"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            className="rounded-md border border-header-border p-1.5 text-heading hover:bg-search-bg"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            className="rounded-md border border-header-border p-1.5 text-heading hover:bg-search-bg"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-card-border-alt bg-[#fcfaf2]">
        {WEEKDAYS.map((day) => (
          <p key={day} className="px-3 py-2.5 text-center text-[11px] font-bold text-[#666]">
            {day}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {grid.map(({ date, inCurrentMonth, isToday }) => {
          const dayEvents = eventsByDay.get(dateKey(date)) ?? []
          return (
            <div
              key={date.toISOString()}
              className={`min-h-[100px] border-b border-r border-card-border-alt p-2 last:border-r-0 ${
                inCurrentMonth ? 'bg-white' : 'bg-search-bg'
              }`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday ? 'bg-orange text-white' : inCurrentMonth ? 'text-heading' : 'text-muted'
                }`}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    title={event.title}
                    className={`truncate rounded px-1.5 py-0.5 text-left text-[10px] font-semibold ${chipStyles[computeEventStatus(event)]}`}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1.5 text-[10px] text-muted">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
