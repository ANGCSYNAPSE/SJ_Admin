import type { DonationTrendPoint } from '../../types/api'

export function DonationTrendChart({ data }: { data: DonationTrendPoint[] }) {
  const max = Math.max(...data.map((d) => d.totalRupees), 1)

  return (
    <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-card-border bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-heading">Donation Trends (Last 12 Months)</p>
        <p className="text-[11px] text-orange">Financial Year {new Date().getFullYear()}</p>
      </div>

      <div className="flex h-[180px] flex-col justify-between">
        <div className="h-px w-full bg-card-border" />
        <div className="flex h-[120px] items-end justify-between gap-2 px-4">
          {data.map((point, i) => {
            const height = Math.max((point.totalRupees / max) * 120, 4)
            const isRecent = i >= data.length - 2
            return (
              <div
                key={point.month + i}
                title={`${point.month}: ₹${point.totalRupees.toLocaleString('en-IN')}`}
                className={`w-5 rounded ${isRecent ? 'bg-orange' : 'bg-maroon'}`}
                style={{ height }}
              />
            )
          })}
        </div>
      </div>

      <div className="flex justify-between px-3 text-[10px] text-muted">
        {data.map((point, i) => (
          <p key={point.month + i}>{point.month}</p>
        ))}
      </div>
    </div>
  )
}
