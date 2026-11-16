import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Calendar, ChevronDown, ChevronLeft, ChevronRight, Coins, Megaphone, Play, Plus, Search, SquarePen, Trash2, type LucideIcon } from 'lucide-react'
import { deleteAd, fetchAds, updateAd } from '../../api/ads'
import { apiErrorMessage } from '../../api/client'
import { adStatus, adStatusLabel, adTitle, formatRevenueLakhs, type AdStatus } from '../../lib/ads'
import { formatDate } from '../../lib/format'
import { AdStatusBadge } from '../../components/ads/AdStatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Loader } from '../../components/ui/Loader'
import type { AdItem } from '../../types/api'

const PAGE_SIZE = 8

function KpiCard({ label, value, icon: Icon, tint, iconColor }: { label: string; value: string; icon: LucideIcon; tint: string; iconColor: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase text-muted">{label}</p>
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <p className="text-2xl font-bold text-heading">{value}</p>
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

export function Ads() {
  const [ads, setAds] = useState<AdItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdStatus>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [toRemove, setToRemove] = useState<AdItem[] | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [isPausing, setIsPausing] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchAds()
      .then((items) => {
        if (!cancelled) setAds(items)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'Failed to load advertisements.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const adTypes = useMemo(() => Array.from(new Set(ads.map((a) => a.adType).filter((t): t is string => Boolean(t)))).sort(), [ads])

  const stats = useMemo(() => {
    const now = Date.now()
    const counts: Record<AdStatus, number> = { active: 0, scheduled: 0, expired: 0, paused: 0, draft: 0 }
    ads.forEach((a) => (counts[adStatus(a, now)] += 1))
    const revenue = ads.reduce((sum, a) => sum + Number(a.revenueRupees || 0), 0)
    return { counts, revenue, total: ads.length }
  }, [ads])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ads.filter((a) => {
      if (statusFilter !== 'all' && adStatus(a) !== statusFilter) return false
      if (typeFilter !== 'all' && a.adType !== typeFilter) return false
      if (q && !`${adTitle(a)} ${a.advertiser ?? ''} ${a.page ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [ads, search, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const allOnPage = pageItems.length > 0 && pageItems.every((a) => selected.has(a.id))
  const selectedAds = ads.filter((a) => selected.has(a.id))

  function toggle(id: string) {
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
      pageItems.forEach((a) => (allOnPage ? next.delete(a.id) : next.add(a.id)))
      return next
    })
  }

  async function pauseSelected() {
    setIsPausing(true)
    try {
      const updated = await Promise.all(selectedAds.filter((a) => a.isActive).map((a) => updateAd(a.id, { isActive: false })))
      setAds((prev) => prev.map((a) => updated.find((u) => u.id === a.id) ?? a))
      setSelected(new Set())
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to pause the selected campaigns.'))
    } finally {
      setIsPausing(false)
    }
  }

  async function confirmRemove() {
    if (!toRemove) return
    setIsRemoving(true)
    try {
      await Promise.all(toRemove.map((a) => deleteAd(a.id)))
      const gone = new Set(toRemove.map((a) => a.id))
      setAds((prev) => prev.filter((a) => !gone.has(a.id)))
      setSelected((prev) => new Set([...prev].filter((id) => !gone.has(id))))
      setToRemove(null)
    } catch (err) {
      alert(apiErrorMessage(err, 'Failed to remove the advertisement.'))
    } finally {
      setIsRemoving(false)
    }
  }

  if (isLoading) return <Loader label="Loading advertisements…" />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  const selectClass =
    'appearance-none rounded-lg border border-card-border-alt bg-white py-2 pl-3.5 pr-9 text-[13px] text-body focus:border-orange focus:outline-none'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-5">
        <KpiCard label="Total Ads" value={`${stats.total} ${stats.total === 1 ? 'Campaign' : 'Campaigns'}`} icon={Megaphone} tint="bg-orange/10" iconColor="text-orange" />
        <KpiCard label="Active Ads" value={`${stats.counts.active} Live Now`} icon={Play} tint="bg-success/10" iconColor="text-success" />
        <KpiCard label="Scheduled" value={`${stats.counts.scheduled} Waiting`} icon={Calendar} tint="bg-[#0d47a1]/10" iconColor="text-[#0d47a1]" />
        <KpiCard label="Expired" value={`${stats.counts.expired} Archived`} icon={Archive} tint="bg-muted/10" iconColor="text-muted" />
        <KpiCard label="Revenue" value={formatRevenueLakhs(stats.revenue)} icon={Coins} tint="bg-maroon/10" iconColor="text-maroon" />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-card-border-alt bg-white p-5">
        <div className="flex items-center gap-4">
          <div className="flex w-60 items-center gap-2 rounded-lg border border-card-border-alt px-3.5 py-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Search advertisements..."
              className="w-full bg-transparent text-[13px] text-heading placeholder:text-muted focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | AdStatus)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="all">Status: All</option>
              {(Object.keys(adStatusLabel) as AdStatus[]).map((key) => (
                <option key={key} value={key}>
                  Status: {adStatusLabel[key]}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setPage(1)
              }}
              className={selectClass}
            >
              <option value="all">Type: All Formats</option>
              {adTypes.map((t) => (
                <option key={t} value={t}>
                  Type: {t}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>
        </div>

        <Link
          to="/advertisement/new"
          className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          Create New Ad
        </Link>
      </div>

      <div className="w-full rounded-xl border border-card-border-alt bg-white">
        <div className="flex items-center rounded-t-xl border-b border-card-border-alt bg-[#f5ede0] px-6 py-4">
          <div className="flex w-8 shrink-0 items-start">
            <button
              type="button"
              onClick={togglePage}
              aria-label="Select all on page"
              className={`size-4 rounded border-[1.5px] ${allOnPage ? 'border-orange bg-orange' : 'border-muted bg-transparent'}`}
            />
          </div>
          <p className="flex-1 text-[13px] font-bold text-body">AD TITLE</p>
          <p className="w-40 shrink-0 text-[13px] font-bold text-body">ADVERTISER</p>
          <p className="w-[120px] shrink-0 text-[13px] font-bold text-body">TYPE</p>
          <p className="w-[140px] shrink-0 text-[13px] font-bold text-body">PLACEMENT</p>
          <p className="w-[150px] shrink-0 text-[13px] font-bold text-body">CAMPAIGN DATES</p>
          <p className="w-[100px] shrink-0 text-[13px] font-bold text-body">IMPRESSIONS</p>
          <p className="w-[110px] shrink-0 text-[13px] font-bold text-body">STATUS</p>
          <p className="w-20 shrink-0 text-right text-[13px] font-bold text-body">ACTIONS</p>
        </div>

        {pageItems.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">
            {ads.length === 0 ? 'No advertisements yet. Create your first campaign.' : 'No advertisements match these filters.'}
          </p>
        ) : (
          pageItems.map((ad, i) => (
            <div key={ad.id} className={`flex items-center border-b border-card-border-alt px-6 py-3.5 ${i % 2 === 1 ? 'bg-search-bg' : 'bg-white'}`}>
              <div className="flex w-8 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={() => toggle(ad.id)}
                  aria-label="Select row"
                  className={`size-4 rounded border-[1.5px] ${selected.has(ad.id) ? 'border-orange bg-orange' : 'border-card-border-alt bg-white'}`}
                />
              </div>
              <p className="flex-1 truncate pr-3 text-[13px] font-semibold text-heading">{adTitle(ad)}</p>
              <p className="w-40 shrink-0 truncate pr-2 text-[13px] text-body">{ad.advertiser ?? '—'}</p>
              <p className="w-[120px] shrink-0 truncate pr-2 text-[13px] text-muted">{ad.adType ?? '—'}</p>
              <p className="w-[140px] shrink-0 pr-2 text-[13px] text-body">{ad.page ?? '—'}</p>
              <div className="flex w-[150px] shrink-0 flex-col gap-0.5">
                <p className="text-xs text-heading">{formatDate(ad.startsAt ?? ad.createdAt)}</p>
                <p className="text-[11px] text-muted">{ad.endsAt ? `to ${formatDate(ad.endsAt)}` : 'No end date'}</p>
              </div>
              <div className="flex w-[100px] shrink-0 flex-col gap-0.5">
                <p className="text-[13px] font-semibold text-heading">{ad.impressions.toLocaleString('en-US')}</p>
                <p className="text-[11px] text-muted">{ad.clicks.toLocaleString('en-US')} clicks</p>
              </div>
              <div className="w-[110px] shrink-0">
                <AdStatusBadge status={adStatus(ad)} />
              </div>
              <div className="flex w-20 shrink-0 items-center justify-end gap-3">
                <Link to={`/advertisement/${ad.id}/edit`} title="Edit advertisement" className="text-orange hover:text-orange-active">
                  <SquarePen size={14} />
                </Link>
                <button type="button" onClick={() => setToRemove([ad])} title="Remove advertisement" className="text-[#ef4444] hover:opacity-70">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            {selectedAds.length > 0 && (
              <>
                <p className="text-sm font-medium text-heading">{selectedAds.length} selected</p>
                <button
                  type="button"
                  onClick={pauseSelected}
                  disabled={isPausing || selectedAds.every((a) => !a.isActive)}
                  className="rounded-md bg-[#fff9e6] px-3.5 py-1.5 text-xs font-semibold text-[#b78103] hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPausing ? 'Pausing…' : 'Pause Campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => setToRemove(selectedAds)}
                  className="rounded-md border border-[#ef4444] px-3.5 py-1.5 text-xs font-semibold text-[#ef4444] hover:bg-[#fdf2f2]"
                >
                  Remove Ad
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[13px] text-body">
              {filtered.length === 0 ? 'No advertisements' : `Showing ${rangeStart}-${rangeEnd} of ${filtered.length} advertisements`}
            </p>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Previous page"
              className="rounded-md border border-card-border-alt p-1.5 text-heading hover:bg-search-bg disabled:opacity-40"
            >
              <ChevronLeft size={12} />
            </button>
            {pageList(currentPage, totalPages).map((p, i) =>
              p === 'gap' ? (
                <span key={`gap-${i}`} className="text-[11px] font-medium text-muted">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] ${p === currentPage ? 'bg-maroon font-bold text-white' : 'border border-card-border-alt text-heading hover:bg-search-bg'}`}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Next page"
              className="rounded-md border border-card-border-alt p-1.5 text-heading hover:bg-search-bg disabled:opacity-40"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {toRemove && (
        <ConfirmDialog
          title={toRemove.length === 1 ? 'Remove Advertisement?' : `Remove ${toRemove.length} Advertisements?`}
          description={
            toRemove.length === 1
              ? `Are you sure you want to remove "${adTitle(toRemove[0])}"? This action cannot be undone.`
              : 'Are you sure you want to remove the selected advertisements? This action cannot be undone.'
          }
          confirmLabel="Remove"
          isConfirming={isRemoving}
          onConfirm={confirmRemove}
          onCancel={() => setToRemove(null)}
        />
      )}
    </div>
  )
}
