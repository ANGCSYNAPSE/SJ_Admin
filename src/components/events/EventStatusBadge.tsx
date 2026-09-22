import { eventStatusLabel, type EventStatus } from '../../lib/eventStatus'

const styles: Record<EventStatus, string> = {
  draft: 'bg-[#fff9e6] text-[#d39e00]',
  upcoming: 'bg-[#e3f2fd] text-success',
  live: 'bg-[#e3f2fd] text-success',
  completed: 'bg-[#e3f2fd] text-success',
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {eventStatusLabel[status]}
    </span>
  )
}
