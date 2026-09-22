import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  iconTintClass?: string
  delta?: string
  caption?: string
}

export function StatCard({ label, value, icon: Icon, iconTintClass = 'bg-icon-tint', delta, caption }: StatCardProps) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-card-border bg-white p-5 shadow-[0_4px_6px_rgba(107,31,31,0.04)]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconTintClass}`}>
          <Icon size={20} className="text-orange" strokeWidth={2} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[22px] font-bold text-heading">{value}</p>
        {delta && <p className="text-[11px] font-medium text-success">{delta}</p>}
        {caption && !delta && <p className="text-[11px] font-medium text-muted">{caption}</p>}
      </div>
    </div>
  )
}
