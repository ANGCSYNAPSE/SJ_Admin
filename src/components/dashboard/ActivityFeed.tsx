import type { ActivityItem, ActivityKind } from '../../types/api'
import { formatRelativeTime } from '../../lib/format'

const dotColor: Record<ActivityKind, string> = {
  temple_listed: 'bg-orange',
  donation_received: 'bg-success',
  blog_submitted: 'bg-blue-500',
  artist_approval_requested: 'bg-orange',
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="flex w-[450px] shrink-0 flex-col gap-4 rounded-2xl border border-card-border-alt bg-white p-6">
      <p className="text-sm font-semibold text-heading">Live Activity Log</p>

      {items.length === 0 ? (
        <p className="text-xs text-muted">No recent activity yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className={`size-2 shrink-0 rounded-full ${dotColor[item.kind]}`} />
              <p className="flex-1 truncate text-xs text-heading">{item.message}</p>
              <p className="shrink-0 text-[11px] text-[#999]">{formatRelativeTime(item.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
