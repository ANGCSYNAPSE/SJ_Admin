import { adStatusLabel, type AdStatus } from '../../lib/ads'

const styles: Record<AdStatus, string> = {
  active: 'bg-[#eefbf3] text-[#1e7e34]',
  scheduled: 'bg-[#e3f2fd] text-[#0d47a1]',
  expired: 'bg-[#faf7f2] text-[#968a8a]',
  paused: 'bg-[#fff9e6] text-[#b78103]',
  draft: 'bg-[#f1ecff] text-[#5b3cc4]',
}

export function AdStatusBadge({ status }: { status: AdStatus }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold ${styles[status]}`}>
      {adStatusLabel[status]}
    </span>
  )
}
