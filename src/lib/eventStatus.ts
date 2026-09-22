import type { EventItem } from '../types/api'

export type EventStatus = 'draft' | 'upcoming' | 'live' | 'completed'

export function computeEventStatus(event: EventItem): EventStatus {
  if (!event.isPublished) return 'draft'

  const now = Date.now()
  const start = new Date(event.startDate).getTime()
  const end = event.endDate ? new Date(event.endDate).getTime() : null

  if (now < start) return 'upcoming'
  if (end !== null && now > end) return 'completed'
  // No end date set: treat as ongoing/live once it starts, since there's no
  // real signal that it's over.
  return 'live'
}

export const eventStatusLabel: Record<EventStatus, string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
}
