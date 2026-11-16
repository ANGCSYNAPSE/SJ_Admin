import { fieldLabel, statusLabel } from '../../lib/registrations'
import type { RegistrationStatus } from '../../types/api'

const statusStyles: Record<RegistrationStatus, string> = {
  pending: 'bg-[#fef7ea] text-[#d39e00]',
  approved: 'bg-[#eefbf3] text-[#22c55e]',
  rejected: 'bg-[#fdf2f2] text-[#ef4444]',
  blocked: 'bg-[#f1f1f1] text-[#666]',
}

export function RegistrationStatusBadge({ status }: { status: RegistrationStatus }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabel[status]}
    </span>
  )
}

/** Complete, or Incomplete with how many required details are still missing (hover for which). */
export function CompletenessBadge({ isComplete, missing }: { isComplete: boolean; missing: string[] }) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#eefbf3] px-2.5 py-1 text-xs font-semibold text-[#22c55e]">Complete</span>
    )
  }
  return (
    <span
      title={`Missing: ${missing.map(fieldLabel).join(', ')}`}
      className="inline-flex items-center rounded-full bg-[#fff1e6] px-2.5 py-1 text-xs font-semibold text-orange"
    >
      Incomplete · {missing.length} missing
    </span>
  )
}
