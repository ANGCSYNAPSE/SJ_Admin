import { userStatusLabel, type UserStatus } from '../../lib/users'

const styles: Record<UserStatus, string> = {
  active: 'bg-[#eefbf3] text-[#22c55e]',
  suspended: 'bg-[#fdf2f2] text-[#ef4444]',
  unverified: 'bg-[#fef7ea] text-[#d39e00]',
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {userStatusLabel[status]}
    </span>
  )
}
