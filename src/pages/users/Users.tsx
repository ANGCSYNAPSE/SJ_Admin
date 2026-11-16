import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, Home, MessageSquare, MoreHorizontal, Shield, SquarePen, Trash2, User, type LucideIcon } from 'lucide-react'
import { deleteUser, fetchUsers, setUserBlocked } from '../../api/users'
import { apiErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib/format'
import { formatLastActive, roleLabel, userStatus, usersToCsv, type UserStatus } from '../../lib/users'
import { UserStatusBadge } from '../../components/users/UserStatusBadge'
import { DeleteUserDialog } from '../../components/users/DeleteUserDialog'
import type { AdminUser, UserRole } from '../../types/api'
import { Loader } from '../../components/ui/Loader'

const PAGE_SIZE = 10
const DAY_MS = 86_400_000

function StatCard({
  label,
  value,
  trend,
  trendTone = 'good',
  icon: Icon,
  iconBg,
}: {
  label: string
  value: string
  trend: string
  trendTone?: 'good' | 'bad'
  icon: LucideIcon
  iconBg: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#666]">{label}</p>
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[28px] font-bold text-[#333]">{value}</p>
        <div className={`flex items-center gap-1 text-[13px] font-semibold ${trendTone === 'good' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
          <ArrowUpRight size={14} />
          {trend}
        </div>
      </div>
    </div>
  )
}

function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, 2, 3, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

export function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchUsers()
      .then((items) => {
        if (!cancelled) setUsers(items)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load users.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!menuFor) return
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuFor(null)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuFor])

  const stats = useMemo(() => {
    const now = Date.now()
    const total = users.length
    const activeThisMonth = users.filter((u) => u.lastLoginAt && now - new Date(u.lastLoginAt).getTime() <= 30 * DAY_MS).length
    const newThisWeek = users.filter((u) => now - new Date(u.createdAt).getTime() <= 7 * DAY_MS).length
    const suspended = users.filter((u) => u.isBlocked).length
    const pct = (n: number) => (total === 0 ? '0%' : `${((n / total) * 100).toFixed(n / total < 0.1 ? 2 : 1)}%`)
    return { total, activeThisMonth, newThisWeek, suspended, pct }
  }, [users])

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false
        if (statusFilter !== 'all' && userStatus(u) !== statusFilter) return false
        return true
      }),
    [users, roleFilter, statusFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((u) => selected.has(u.id))

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev)
      pageItems.forEach((u) => (allOnPageSelected ? next.delete(u.id) : next.add(u.id)))
      return next
    })
  }

  function replaceUser(updated: AdminUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated, lastLoginAt: u.lastLoginAt } : u)))
  }

  async function toggleBlocked(target: AdminUser) {
    setMenuFor(null)
    try {
      replaceUser(await setUserBlocked(target.id, !target.isBlocked))
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to update this user.'))
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      await deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((x) => x.id !== userToDelete.id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(userToDelete.id)
        return next
      })
      setUserToDelete(null)
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to delete this user.'))
    } finally {
      setIsDeleting(false)
    }
  }

  function exportUsers() {
    const rows = selected.size > 0 ? users.filter((u) => selected.has(u.id)) : filtered
    const blob = new Blob([usersToCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <Loader label="Loading users…" />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const selectClass =
    'appearance-none rounded-md border border-card-border-alt bg-[#f7f5ee] py-2 pl-3 pr-8 text-[13px] text-heading focus:border-orange focus:outline-none'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <StatCard label="Total Users" value={stats.total.toLocaleString('en-IN')} trend={`${stats.newThisWeek.toLocaleString('en-IN')} new this week`} icon={User} iconBg="bg-orange" />
        <StatCard
          label="Active This Month"
          value={stats.activeThisMonth.toLocaleString('en-IN')}
          trend={`${stats.total === 0 ? '0' : ((stats.activeThisMonth / stats.total) * 100).toFixed(1)}% engagement rate`}
          icon={MessageSquare}
          iconBg="bg-maroon"
        />
        <StatCard
          label="New Sign-ups (This Week)"
          value={stats.newThisWeek.toLocaleString('en-IN')}
          trend={`${stats.pct(stats.newThisWeek)} of total directory`}
          icon={Home}
          iconBg="bg-orange"
        />
        <StatCard
          label="Suspended Accounts"
          value={stats.suspended.toLocaleString('en-IN')}
          trend={`${stats.pct(stats.suspended)} of total directory`}
          trendTone="bad"
          icon={Shield}
          iconBg="bg-maroon"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as 'all' | UserRole)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="all">Role: All Roles</option>
              {(Object.keys(roleLabel) as UserRole[]).map((key) => (
                <option key={key} value={key}>
                  Role: {roleLabel[key]}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | UserStatus)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="all">Status: All Statuses</option>
              <option value="active">Status: Active</option>
              <option value="suspended">Status: Suspended</option>
              <option value="unverified">Status: Unverified</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/users/new" className="rounded-lg bg-orange px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90">
            Add User
          </Link>
          <button
            type="button"
            onClick={exportUsers}
            className="rounded-lg border border-card-border-alt bg-white px-4 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg"
          >
            Export Users
          </button>
        </div>
      </div>

      <div className="w-full rounded-xl border border-card-border-alt bg-white">
        <div className="flex items-center rounded-md bg-[#faf6ee] px-6 py-3">
          <div className="flex w-10 shrink-0 items-center">
            <button
              type="button"
              onClick={togglePage}
              aria-label="Select all on page"
              className={`size-[18px] rounded border-2 ${allOnPageSelected ? 'border-orange bg-orange' : 'border-[#999] bg-transparent'}`}
            />
          </div>
          <p className="flex-1 text-[13px] font-semibold text-[#666]">USER NAME</p>
          <p className="w-[220px] shrink-0 text-[13px] font-semibold text-[#666]">EMAIL</p>
          <p className="w-[150px] shrink-0 text-[13px] font-semibold text-[#666]">PHONE</p>
          <p className="w-40 shrink-0 text-[13px] font-semibold text-[#666]">ROLE</p>
          <p className="w-[120px] shrink-0 text-[13px] font-semibold text-[#666]">JOINED DATE</p>
          <p className="w-[120px] shrink-0 text-[13px] font-semibold text-[#666]">LAST ACTIVE</p>
          <p className="w-[100px] shrink-0 text-[13px] font-semibold text-[#666]">STATUS</p>
          <p className="w-[100px] shrink-0 text-right text-[13px] font-semibold text-[#666]">ACTIONS</p>
        </div>

        {pageItems.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">No users match these filters.</p>
        ) : (
          pageItems.map((u) => (
            <div key={u.id} className="flex items-center border-b border-card-border-alt px-6 py-3">
              <div className="flex w-10 shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => toggleSelected(u.id)}
                  aria-label="Select row"
                  className={`size-[18px] rounded border-2 ${selected.has(u.id) ? 'border-orange bg-orange' : 'border-[#999] bg-transparent'}`}
                />
              </div>
              <p className="flex-1 truncate pr-3 text-sm font-semibold text-heading">{u.fullName}</p>
              <p className="w-[220px] shrink-0 truncate pr-3 text-sm text-[#444]">{u.email}</p>
              <p className="w-[150px] shrink-0 text-sm text-[#444]">{u.mobile}</p>
              <p className="w-40 shrink-0 text-sm text-heading">{roleLabel[u.role]}</p>
              <p className="w-[120px] shrink-0 text-sm text-[#666]">{formatDate(u.createdAt)}</p>
              <p className="w-[120px] shrink-0 text-sm text-[#666]">{formatLastActive(u.lastLoginAt)}</p>
              <div className="w-[100px] shrink-0">
                <UserStatusBadge status={userStatus(u)} />
              </div>
              <div className="relative flex w-[100px] shrink-0 items-center justify-end gap-2">
                <Link to={`/users/${u.id}/edit`} title="Edit user" className="flex size-7 items-center justify-center rounded-md border border-card-border-alt bg-[#fcfaf2] text-orange hover:bg-white">
                  <SquarePen size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => setUserToDelete(u)}
                  disabled={u.id === currentUser?.id}
                  title={u.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
                  className="flex size-7 items-center justify-center rounded-md border border-card-border-alt bg-[#fcfaf2] text-[#ef4444] hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === u.id ? null : u.id)}
                  title="More actions"
                  className="flex size-7 items-center justify-center rounded-md border border-card-border-alt bg-[#fcfaf2] text-maroon hover:bg-white"
                >
                  <MoreHorizontal size={14} />
                </button>
                {menuFor === u.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-lg border border-card-border-alt bg-white py-1 shadow-lg"
                  >
                    <button
                      type="button"
                      disabled={u.id === currentUser?.id}
                      onClick={() => toggleBlocked(u)}
                      className="block w-full px-3 py-2 text-left text-[13px] text-heading hover:bg-search-bg disabled:cursor-not-allowed disabled:opacity-50"
                      title={u.id === currentUser?.id ? 'You cannot suspend your own account' : undefined}
                    >
                      {u.isBlocked ? 'Reactivate account' : 'Suspend account'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-[#999]">
            {filtered.length === 0 ? 'No users found' : `Showing ${rangeStart}-${rangeEnd} of ${filtered.length.toLocaleString('en-IN')} users`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-md border border-card-border-alt px-3 py-1.5 text-[13px] font-semibold text-[#444] hover:bg-search-bg disabled:opacity-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {pageList(currentPage, totalPages).map((p, i) =>
                p === 'gap' ? (
                  <span key={`gap-${i}`} className="px-1 text-[13px] text-[#999]">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`rounded-md px-3 py-1.5 text-[13px] ${p === currentPage ? 'bg-orange font-bold text-white' : 'font-medium text-[#666] hover:bg-search-bg'}`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-md border border-card-border-alt px-3 py-1.5 text-[13px] font-semibold text-[#444] hover:bg-search-bg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>


      {userToDelete && (
        <DeleteUserDialog
          userName={userToDelete.fullName}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setUserToDelete(null)}
        />
      )}
    </div>
  )
}
