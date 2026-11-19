import { useCallback, useEffect, useState } from 'react'
import { BellRing, Loader2, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  bulkVerify,
  fetchVerification,
  setVerified,
  type VerificationFilter,
  type VerificationItem,
  type VerificationPage,
} from '../../api/verification'
import { apiErrorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { typeLabel } from '../../lib/registrations'
import { MessageDialog, type Recipient } from '../../components/registrations/MessageDialog'
import { VerificationBadges } from '../../components/verification/VerificationBadges'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'

const PAGE_SIZE = 20
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

/**
 * Who has been checked and who has not. The admin reads what the person filled in, what they paid and which
 * registrations they made, then verifies them (they are told), or messages them to fix something first.
 */
export function Verification() {
  const toast = useToast()
  const [filter, setFilter] = useState<VerificationFilter>('unverified')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<VerificationPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Map<string, VerificationItem>>(new Map())
  const [busy, setBusy] = useState<string | null>(null)
  const [messaging, setMessaging] = useState<Recipient[] | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setQ(search.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setError(null)
    fetchVerification({ status: filter, q: q || undefined, page, pageSize: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the accounts.')))
  }, [filter, q, page, reload])

  const refresh = useCallback(() => setReload((n) => n + 1), [])

  async function verifyOne(item: VerificationItem, verified: boolean) {
    setBusy(item.id)
    try {
      const res = await setVerified(item.id, verified)
      toast.success(res.message)
      refresh()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update this account.'))
    } finally {
      setBusy(null)
    }
  }

  async function verifySelected(verified: boolean) {
    setBusy('bulk')
    try {
      const res = await bulkVerify([...selected.keys()], verified)
      toast.success(res.message)
      setSelected(new Map())
      refresh()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update these accounts.'))
    } finally {
      setBusy(null)
    }
  }

  const toggle = (item: VerificationItem) =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, item)
      return next
    })

  const items = data?.items ?? []
  const allOnPage = items.length > 0 && items.every((i) => selected.has(i.id))
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (allOnPage) items.forEach((i) => next.delete(i.id))
      else items.forEach((i) => next.set(i.id, i))
      return next
    })

  const tabs: { id: VerificationFilter; label: string; count?: number }[] = [
    { id: 'unverified', label: 'Not verified', count: data?.counts.unverified },
    { id: 'ready', label: 'Ready to verify (fee paid)' },
    { id: 'verified', label: 'Verified', count: data?.counts.verified },
    { id: 'all', label: 'Everyone', count: data?.counts.total },
  ]
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-[13px] text-body">
        Every account has three marks: <b>email</b> (they entered the code we emailed), <b>phone</b> (SMS code) and <b>admin</b> (you checked their
        details). Only you can give the admin mark. Verifying tells the person in their notification bell.
      </p>

      <div className="flex gap-1 overflow-x-auto border-b border-card-border-alt">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setFilter(t.id)
              setPage(1)
            }}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              filter === t.id ? 'border-orange text-orange' : 'border-transparent text-body hover:text-heading'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 rounded-full bg-search-bg px-2 py-0.5 text-[11px]">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or mobile" className={`${inputClass} pl-9`} />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-orange/40 bg-[#fff1e6] px-4 py-3 text-[13px]">
          <span className="font-semibold text-heading">{selected.size} selected</span>
          <button type="button" disabled={busy === 'bulk'} onClick={() => verifySelected(true)} className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
            {busy === 'bulk' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Verify
          </button>
          <button type="button" disabled={busy === 'bulk'} onClick={() => verifySelected(false)} className="flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-3 py-1.5 font-semibold text-heading disabled:opacity-60">
            <ShieldOff size={13} /> Set as not verified
          </button>
          <button
            type="button"
            onClick={() => setMessaging([...selected.values()].map((i) => ({ userId: i.id, name: i.fullName })))}
            className="flex items-center gap-1.5 rounded-lg bg-orange px-3 py-1.5 font-semibold text-white"
          >
            <BellRing size={13} /> Send a notification
          </button>
          <button type="button" onClick={() => setSelected(new Map())} className="ml-auto text-muted hover:text-heading">
            Clear
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <Loader />}
      {data && (
        <div className="overflow-x-auto rounded-xl border border-card-border-alt bg-white">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead className="bg-search-bg text-[12px] uppercase tracking-wide text-muted">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select everyone on this page" />
                </th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Registered as</th>
                <th className="px-4 py-3">Fee paid</th>
                <th className="px-4 py-3">Verification</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const enough = u.paid >= (data.fee.minimum ?? 0)
                return (
                  <tr key={u.id} className="border-t border-card-border-alt align-top">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u)} aria-label={`Select ${u.fullName}`} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/users/${u.id}/edit`} className="font-semibold text-heading hover:text-orange">
                        {u.fullName}
                      </Link>
                      {u.isBlocked && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">Suspended</span>}
                      <p className="text-muted">{u.email}</p>
                      <p className="text-muted">
                        {u.mobile}
                        {u.location ? ` · ${u.location}` : ''}
                      </p>
                      <p className="text-[11px] text-muted">Joined {formatDate(u.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {u.registrations.length === 0 ? (
                        <span className="text-muted">Plain member</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {u.registrations.map((r, i) => (
                            <span key={i} className="text-body">
                              <b>{typeLabel[r.type]}</b>
                              {!r.complete && <span className="ml-1 text-amber-700">· {r.missing} detail{r.missing === 1 ? '' : 's'} missing</span>}
                              <span className="ml-1 text-[11px] capitalize text-muted">({r.status})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`font-semibold ${enough ? 'text-green-700' : 'text-amber-700'}`}>{rupees(u.paid)}</p>
                      <p className="text-[11px] text-muted">of {rupees(data.fee.total)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <VerificationBadges
                        emailVerified={u.emailVerified}
                        mobileVerified={u.mobileVerified}
                        isVerified={u.isVerified}
                        emailVerifiedAt={u.emailVerifiedAt}
                        mobileVerifiedAt={u.mobileVerifiedAt}
                        verifiedAt={u.verifiedAt}
                      />
                      {u.isVerified && u.verifiedAt && (
                        <p className="mt-1 text-[11px] text-muted">
                          by {u.verifiedBy ?? 'an admin'} on {formatDate(u.verifiedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          title="Send a notification"
                          onClick={() => setMessaging([{ userId: u.id, name: u.fullName }])}
                          className="rounded-md border border-card-border-alt p-2 text-heading hover:bg-search-bg"
                        >
                          <BellRing size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={busy === u.id}
                          onClick={() => verifyOne(u, !u.isVerified)}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 font-semibold disabled:opacity-60 ${
                            u.isVerified ? 'border border-card-border-alt text-heading hover:bg-search-bg' : 'bg-green-600 text-white'
                          }`}
                        >
                          {busy === u.id ? <Loader2 size={13} className="animate-spin" /> : u.isVerified ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                          {u.isVerified ? 'Un-verify' : 'Verify'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    {filter === 'unverified' ? 'Everyone has been verified. Nothing waiting.' : 'No accounts match.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-card-border-alt px-4 py-3 text-[13px] text-body">
            <span>
              {data.total === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, data.total)} of ${data.total}`}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-card-border-alt px-3 py-1.5 font-semibold disabled:opacity-40">
                Previous
              </button>
              <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-md border border-card-border-alt px-3 py-1.5 font-semibold disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {messaging && (
        <MessageDialog
          recipients={messaging}
          initialKind="info"
          onClose={() => setMessaging(null)}
          onSent={() => setSelected(new Map())}
        />
      )}
    </div>
  )
}
