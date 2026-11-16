import type { AdminUser, UserRole } from '../types/api'

export const roleLabel: Record<UserRole, string> = {
  member: 'Devotee',
  artist: 'Artist',
  temple_admin: 'Temple Admin',
  admin: 'Admin',
}

export type UserStatus = 'active' | 'suspended' | 'unverified'

export function userStatus(user: AdminUser): UserStatus {
  if (user.isBlocked) return 'suspended'
  if (!user.isVerified) return 'unverified'
  return 'active'
}

export const userStatusLabel: Record<UserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  unverified: 'Unverified',
}

/** e.g. "2 mins ago", "Yesterday", "Jan 05, 2026" — or "Never" if the user has not signed in. */
export function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export function usersToCsv(users: AdminUser[]): string {
  const header = ['Name', 'Email', 'Phone', 'Role', 'Joined', 'Last Active', 'Status']
  const rows = users.map((u) => [
    u.fullName,
    u.email,
    u.mobile,
    roleLabel[u.role],
    new Date(u.createdAt).toISOString().slice(0, 10),
    u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '',
    userStatusLabel[userStatus(u)],
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}
