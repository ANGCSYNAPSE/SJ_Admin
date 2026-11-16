import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, ClipboardCheck, ClipboardList, Eye, Search, TriangleAlert, Users, type LucideIcon } from 'lucide-react'
import { fetchRegistrations } from '../../api/registrations'
import { apiErrorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { fieldLabel, statusLabel, typeLabel } from '../../lib/registrations'
import { CompletenessBadge, RegistrationStatusBadge } from '../../components/registrations/RegistrationBadges'
import { RegistrationDrawer } from '../../components/registrations/RegistrationDrawer'
import { MessageDialog, type Recipient } from '../../components/registrations/MessageDialog'
import { Loader } from '../../components/ui/Loader'
import type { RegistrationRow, RegistrationStatus, RegistrationType } from '../../types/api'

const PAGE_SIZE = 10

type ProfileFilter = 'all' | 'complete' | 'incomplete'

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-4 rounded-xl border border-card-border-alt bg-white p-5">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[26px] font-bold leading-tight text-[#333]">{value.toLocaleString('en-IN')}</p>
        <p className="truncate text-[13px] font-medium text-[#666]">{label}</p>
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

const selectClass =
  'appearance-none rounded-md border border-card-border-alt bg-[#f7f5ee] py-2 pl-3 pr-8 text-[13px] text-heading focus:border-orange focus:outline-none'

/**
 * Every category's registrations in one table. Complete and incomplete profiles
 * live together — the "Profile" filter separates them — and a row opens a panel
 * with the full details, review actions and a way to message the person.
 */
export function Registrations() {
  const [rows, setRows] = useState<RegistrationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | RegistrationType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | RegistrationStatus>('all')
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [composer, setComposer] = useState<{ recipients: Recipient[]; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchRegistrations()
      .then((items) => !cancelled && setRows(items))
      .catch((err) => !cancelled && setError(apiErrorMessage(err, 'Failed to load registrations.')))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      incomplete: rows.filter((r) => !r.isComplete).length,
      approved: rows.filter((r) => r.status === 'approved').length,
    }),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (profileFilter === 'complete' && !r.isComplete) return false
      if (profileFilter === 'incomplete' && r.isComplete) return false
      if (q && !`${r.displayName} ${r.fullName} ${r.email} ${r.phone}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, typeFilter, statusFilter, profileFilter])

  const hasFilters = search !== '' || typeFilter !== 'all' || statusFilter !== 'all' || profileFilter !== 'all'
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((r) => selected.has(r.id))
  const openRow = rows.find((r) => r.id === openId) ?? null

  function filterChange<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(1)
    }
  }

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
      pageItems.forEach((r) => (allOnPageSelected ? next.delete(r.id) : next.add(r.id)))
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter('all')
    setProfileFilter('all')
    setPage(1)
  }

  /** One recipient per person, even if they hold several registrations. */
  function recipientsOf(list: RegistrationRow[]): Recipient[] {
    const seen = new Map<string, Recipient>()
    list.forEach((r) => seen.set(r.userId, { userId: r.userId, name: r.fullName }))
    return [...seen.values()]
  }

  function messageSelected() {
    setComposer({ recipients: recipientsOf(rows.filter((r) => selected.has(r.id))), message: '' })
  }

  function remindIncomplete() {
    const incomplete = rows.filter((r) => !r.isComplete)
    setComposer({
      recipients: recipientsOf(incomplete),
      message: 'Your registration is almost done. Please add the remaining details so our team can review it.',
    })
  }

  if (isLoading) return <Loader label="Loading registrations…" />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <Stat label="Total registrations" value={stats.total} icon={Users} tone="bg-orange" />
        <Stat label="Awaiting review" value={stats.pending} icon={ClipboardList} tone="bg-maroon" />
        <Stat label="Incomplete profiles" value={stats.incomplete} icon={TriangleAlert} tone="bg-orange" />
        <Stat label="Approved" value={stats.approved} icon={ClipboardCheck} tone="bg-maroon" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => filterChange(setSearch)(e.target.value)}
              placeholder="Search name, email or phone"
              className="w-[250px] rounded-md border border-card-border-alt bg-[#f7f5ee] py-2 pl-9 pr-3 text-[13px] text-heading focus:border-orange focus:outline-none"
            />
          </div>
          <div className="relative">
            <select value={typeFilter} onChange={(e) => filterChange(setTypeFilter)(e.target.value as 'all' | RegistrationType)} className={selectClass}>
              <option value="all">Category: All</option>
              {(Object.keys(typeLabel) as RegistrationType[]).map((t) => (
                <option key={t} value={t}>
                  Category: {typeLabel[t]}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => filterChange(setStatusFilter)(e.target.value as 'all' | RegistrationStatus)} className={selectClass}>
              <option value="all">Status: All</option>
              {(Object.keys(statusLabel) as RegistrationStatus[]).map((s) => (
                <option key={s} value={s}>
                  Status: {statusLabel[s]}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <select value={profileFilter} onChange={(e) => filterChange(setProfileFilter)(e.target.value as ProfileFilter)} className={selectClass}>
              <option value="all">Profile: All</option>
              <option value="complete">Profile: Complete</option>
              <option value="incomplete">Profile: Incomplete</option>
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-[13px] font-semibold text-orange hover:underline">
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selected.size > 0 ? (
            <>
              <button type="button" onClick={() => setSelected(new Set())} className="text-[13px] font-semibold text-body hover:underline">
                Clear selection
              </button>
              <button
                type="button"
                onClick={messageSelected}
                className="flex items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-[13px] font-semibold text-white hover:opacity-90"
              >
                <BellRing size={14} /> Message {selected.size} selected
              </button>
            </>
          ) : (
            stats.incomplete > 0 && (
              <button
                type="button"
                onClick={remindIncomplete}
                className="flex items-center gap-2 rounded-lg border border-card-border-alt bg-white px-4 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg"
              >
                <BellRing size={14} className="text-orange" /> Remind all incomplete ({stats.incomplete})
              </button>
            )
          )}
        </div>
      </div>

      <div className="w-full rounded-xl border border-card-border-alt bg-white">
        {/* Scrolls sideways on narrow windows instead of squeezing the columns. */}
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
        <div className="flex items-center rounded-md bg-[#faf6ee] px-6 py-3">
          <div className="flex w-10 shrink-0 items-center">
            <button
              type="button"
              onClick={togglePage}
              aria-label="Select all on page"
              className={`size-[18px] rounded border-2 ${allOnPageSelected ? 'border-orange bg-orange' : 'border-[#999] bg-transparent'}`}
            />
          </div>
          <p className="flex-1 text-[13px] font-semibold text-[#666]">NAME</p>
          <p className="w-[150px] shrink-0 text-[13px] font-semibold text-[#666]">CATEGORY</p>
          <p className="w-[210px] shrink-0 text-[13px] font-semibold text-[#666]">CONTACT</p>
          <p className="w-[160px] shrink-0 text-[13px] font-semibold text-[#666]">PROFILE</p>
          <p className="w-[100px] shrink-0 text-[13px] font-semibold text-[#666]">STATUS</p>
          <p className="w-[110px] shrink-0 text-[13px] font-semibold text-[#666]">SUBMITTED</p>
          <p className="w-[70px] shrink-0 text-right text-[13px] font-semibold text-[#666]">VIEW</p>
        </div>

        {pageItems.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            {rows.length === 0 ? 'No registrations yet.' : 'No registrations match these filters.'}
          </p>
        ) : (
          pageItems.map((r) => (
            <div
              key={r.id}
              onClick={() => setOpenId(r.id)}
              className="flex cursor-pointer items-center border-b border-card-border-alt px-6 py-3 transition-colors hover:bg-[#fdfaf4]"
            >
              <div className="flex w-10 shrink-0 items-center" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => toggleSelected(r.id)}
                  aria-label="Select row"
                  className={`size-[18px] rounded border-2 ${selected.has(r.id) ? 'border-orange bg-orange' : 'border-[#999] bg-transparent'}`}
                />
              </div>
              <div className="min-w-0 flex-1 pr-3">
                <p className="truncate text-sm font-semibold text-heading">{r.displayName}</p>
                {r.displayName !== r.fullName && <p className="truncate text-xs text-muted">by {r.fullName}</p>}
              </div>
              <p className="w-[150px] shrink-0 text-sm text-heading">{typeLabel[r.type]}</p>
              <div className="w-[210px] shrink-0 pr-3">
                <p className="truncate text-sm text-[#444]">{r.email}</p>
                <p className="text-xs text-muted">+91 {r.phone}</p>
              </div>
              <div className="w-[160px] shrink-0 pr-2" title={r.isComplete ? undefined : `Missing: ${r.missing.map(fieldLabel).join(', ')}`}>
                <CompletenessBadge isComplete={r.isComplete} missing={r.missing} />
              </div>
              <div className="w-[100px] shrink-0">
                <RegistrationStatusBadge status={r.status} />
              </div>
              <p className="w-[110px] shrink-0 text-sm text-[#666]">{formatDate(r.createdAt)}</p>
              <div className="flex w-[70px] shrink-0 justify-end">
                <span className="flex size-7 items-center justify-center rounded-md border border-card-border-alt bg-[#fcfaf2] text-orange">
                  <Eye size={14} />
                </span>
              </div>
            </div>
          ))
        )}

          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4">
          <p className="text-sm text-[#999]">
            {filtered.length === 0 ? 'No registrations found' : `Showing ${rangeStart}-${rangeEnd} of ${filtered.length.toLocaleString('en-IN')} registrations`}
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

      {openRow && (
        <RegistrationDrawer
          row={openRow}
          onClose={() => setOpenId(null)}
          onRowChange={(id, patch) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
          onDeleted={(id) => {
            setRows((prev) => prev.filter((r) => r.id !== id))
            setSelected((prev) => {
              const next = new Set(prev)
              next.delete(id)
              return next
            })
            setOpenId(null)
          }}
        />
      )}

      {composer && (
        <MessageDialog
          recipients={composer.recipients}
          initialMessage={composer.message}
          initialKind={composer.message ? 'warning' : 'info'}
          initialLink={composer.message ? '/complete-profile' : ''}
          onClose={() => setComposer(null)}
          onSent={() => setSelected(new Set())}
        />
      )}
    </div>
  )
}
