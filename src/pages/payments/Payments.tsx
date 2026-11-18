import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  BadgeCheck,
  BellRing,
  CircleAlert,
  Coins,
  HandCoins,
  Loader2,
  PlugZap,
  Search,
  Settings2,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchDiagnostics,
  fetchFeeSettings,
  fetchOwing,
  fetchPaymentSummary,
  fetchPayments,
  recordManualPayment,
  saveFeeSettings,
  type Diagnostics,
  type FeeSettings,
  type OwingUser,
  type Page,
  type PaymentRow,
  type PaymentSummary,
} from '../../api/payments'
import { apiErrorMessage } from '../../api/client'
import { formatDate, formatDateTime } from '../../lib/format'
import { typeLabel } from '../../lib/registrations'
import { MessageDialog, type Recipient } from '../../components/registrations/MessageDialog'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'
import type { RegistrationType } from '../../types/api'

const PAGE_SIZE = 10
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

type Tab = 'overview' | 'owing' | 'payments' | 'settings'
const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'owing', label: 'Pending payments' },
  { id: 'payments', label: 'All payments' },
  { id: 'settings', label: 'Fee & Razorpay' },
]

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'
const selectClass =
  'appearance-none rounded-md border border-card-border-alt bg-[#f7f5ee] py-2 pl-3 pr-8 text-[13px] text-heading focus:border-orange focus:outline-none'

function Stat({ label, value, icon: Icon, tone, hint }: { label: string; value: string; icon: LucideIcon; tone: string; hint?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-xl border border-card-border-alt bg-white p-5">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[24px] font-bold leading-tight text-[#333]">{value}</p>
        <p className="truncate text-[13px] font-medium text-[#666]">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted">{hint}</p>}
      </div>
    </div>
  )
}

function Pill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'grey'; children: ReactNode }) {
  const styles = {
    green: 'bg-green-100 text-green-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    grey: 'bg-gray-100 text-gray-600',
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${styles[tone]}`}>{children}</span>
}

const statusTone = (s: string) => (s === 'paid' ? 'green' : s === 'failed' ? 'red' : 'grey')

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return (
    <div className="flex items-center justify-between border-t border-card-border-alt px-4 py-3 text-[13px] text-body">
      <span>
        {total === 0 ? 'No results' : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
      </span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-md border border-card-border-alt px-3 py-1.5 font-semibold disabled:opacity-40">
          Previous
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-md border border-card-border-alt px-3 py-1.5 font-semibold disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  )
}

/** The registration fee: what has been collected, who still owes, every payment, and the fee and Razorpay settings. */
export function Payments() {
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 overflow-x-auto border-b border-card-border-alt">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? 'border-orange text-orange' : 'border-transparent text-body hover:text-heading'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'owing' && <Owing />}
      {tab === 'payments' && <AllPayments />}
      {tab === 'settings' && <FeeAndRazorpay />}
    </div>
  )
}

/* ───────── Overview ───────── */
function Overview() {
  const [data, setData] = useState<PaymentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPaymentSummary().then(setData).catch((e) => setError(apiErrorMessage(e, 'Could not load the payment summary.')))
  }, [])

  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <Loader />

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected so far" value={rupees(data.collected.amount)} icon={Wallet} tone="bg-green-600" hint={`${data.collected.payments} payments`} />
        <Stat label="Collected today" value={rupees(data.collected.today.amount)} icon={Coins} tone="bg-orange" hint={`${data.collected.today.count} payments`} />
        <Stat label="Still to collect" value={rupees(data.outstanding.amount)} icon={HandCoins} tone="bg-red-500" hint="balance across all members" />
        <Stat label="Collection rate" value={`${data.collectionRate}%`} icon={ShieldCheck} tone="bg-maroon" hint={`of ${rupees(data.fee.total)} per member`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Paid in full" value={String(data.members.fullyPaid)} icon={BadgeCheck} tone="bg-green-600" />
        <Stat label="Part paid" value={String(data.members.partial)} icon={CircleAlert} tone="bg-amber-500" hint="a balance is due" />
        <Stat label="Not paid yet" value={String(data.members.unpaid)} icon={CircleAlert} tone="bg-red-500" hint={`of ${data.members.total} members`} />
      </div>
      <p className="text-[13px] text-muted">
        Fee: {rupees(data.fee.total)} in total, at least {rupees(data.fee.minimum)} for the first payment.
        {data.outstanding.failedAttempts > 0 && ` ${data.outstanding.failedAttempts} failed attempt(s).`}
        {data.outstanding.abandonedCheckouts > 0 && ` ${data.outstanding.abandonedCheckouts} checkout(s) started but not finished.`}
      </p>
    </div>
  )
}

/* ───────── Pending payments ───────── */
function Owing() {
  const toast = useToast()
  const [state, setState] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<OwingUser> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<OwingUser | null>(null)
  const [composer, setComposer] = useState<{ recipients: Recipient[]; message: string } | null>(null)

  const load = useCallback(() => {
    setError(null)
    fetchOwing({ state: state || undefined, q: q || undefined, page, limit: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the list.')))
  }, [state, q, page])

  useEffect(load, [load])
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setQ(search.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or mobile" className={`${inputClass} pl-9`} />
        </div>
        <select
          value={state}
          onChange={(e) => {
            setPage(1)
            setState(e.target.value)
          }}
          className={selectClass}
        >
          <option value="">Everyone who owes</option>
          <option value="pending">Nothing paid yet</option>
          <option value="partial">Part paid</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <Loader />}
      {data && (
        <div className="overflow-x-auto rounded-xl border border-card-border-alt bg-white">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-search-bg text-[12px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Registered as</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Last attempt</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} className="border-t border-card-border-alt align-top">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-heading">{u.fullName}</p>
                    <p className="text-muted">{u.email}</p>
                    <p className="text-muted">+91 {u.mobile}</p>
                  </td>
                  <td className="px-4 py-3 text-body">
                    {u.registrations.length === 0 ? 'Member' : u.registrations.map((t) => typeLabel[t as RegistrationType] ?? t).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={u.state === 'partial' ? 'amber' : 'red'}>{u.state === 'partial' ? 'Part paid' : 'Not paid'}</Pill>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-700">{rupees(u.paid)}</td>
                  <td className="px-4 py-3 font-semibold text-red-600">{rupees(u.balance)}</td>
                  <td className="px-4 py-3 text-body">
                    {u.lastAttempt ? (
                      <>
                        <Pill tone={statusTone(u.lastAttempt.status)}>{u.lastAttempt.status === 'created' ? 'not finished' : u.lastAttempt.status}</Pill>
                        <p className="mt-1 text-muted">{rupees(u.lastAttempt.amount)} · {formatDateTime(u.lastAttempt.at)}</p>
                      </>
                    ) : (
                      <span className="text-muted">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setComposer({
                            recipients: [{ userId: u.id, name: u.fullName }],
                            message: `${rupees(u.balance)} of your Shyam Jagat registration fee is still pending. Please complete the payment from your profile.`,
                          })
                        }
                        className="flex items-center gap-1.5 rounded-md border border-card-border-alt px-2.5 py-1.5 font-semibold text-heading hover:bg-search-bg"
                      >
                        <BellRing size={13} /> Remind
                      </button>
                      <button type="button" onClick={() => setPaying(u)} className="rounded-md bg-orange px-2.5 py-1.5 font-semibold text-white hover:opacity-90">
                        Record payment
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Nobody owes anything here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pager page={page} total={data.total} onPage={setPage} />
        </div>
      )}

      {paying && (
        <ManualPaymentDialog
          user={paying}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null)
            toast.success('Payment recorded.')
            load()
          }}
        />
      )}
      {composer && (
        <MessageDialog
          recipients={composer.recipients}
          initialMessage={composer.message}
          initialKind="warning"
          initialLink="/profile"
          onClose={() => setComposer(null)}
          onSent={(count) => {
            setComposer(null)
            toast.success(`Reminder sent to ${count} ${count === 1 ? 'person' : 'people'}.`)
          }}
        />
      )}
    </div>
  )
}

function ManualPaymentDialog({ user, onClose, onDone }: { user: OwingUser; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(user.balance))
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = Number(amount)
  const valid = Number.isInteger(value) && value > 0 && value <= user.balance && reference.trim().length > 0

  async function save() {
    setBusy(true)
    setError(null)
    try {
      await recordManualPayment({ userId: user.id, amount: value, reference: reference.trim(), note: note.trim() || undefined })
      onDone()
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not record the payment.'))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-label="Record a payment" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <p className="font-display text-xl font-bold text-maroon">Record an offline payment</p>
        <p className="text-sm text-body">
          For money received outside Razorpay (UPI, cash, bank transfer) from <b>{user.fullName}</b>. Balance due: <b>{rupees(user.balance)}</b>.
        </p>
        <label className="text-xs font-semibold text-heading">
          Amount received (₹)
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-semibold text-heading">
          Reference (UPI id, receipt no. …)
          <input value={reference} onChange={(e) => setReference(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-semibold text-heading">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-header-border px-5 py-2.5 text-[13px] font-semibold text-heading">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={!valid || busy} className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
            {busy && <Loader2 size={14} className="animate-spin" />}
            Record payment
          </button>
        </div>
      </div>
    </div>
  )
}

/* ───────── All payments ───────── */
function AllPayments() {
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page<PaymentRow> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    fetchPayments({ status: status || undefined, plan: plan || undefined, q: q || undefined, page, limit: PAGE_SIZE })
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the payments.')))
  }, [status, plan, q, page])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setQ(search.trim())
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or mobile" className={`${inputClass} pl-9`} />
        </div>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value) }} className={selectClass}>
          <option value="">Any status</option>
          <option value="paid">Paid</option>
          <option value="created">Not finished</option>
          <option value="failed">Failed</option>
        </select>
        <select value={plan} onChange={(e) => { setPage(1); setPlan(e.target.value) }} className={selectClass}>
          <option value="">Any type</option>
          <option value="part">Part payment</option>
          <option value="full">Clears the balance</option>
          <option value="manual">Recorded by admin</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <Loader />}
      {data && (
        <div className="overflow-x-auto rounded-xl border border-card-border-alt bg-white">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead className="bg-search-bg text-[12px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Receipt / Razorpay id</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className="border-t border-card-border-alt align-top">
                  <td className="px-4 py-3 text-body">
                    {formatDate(p.paidAt ?? p.createdAt)}
                    <p className="text-[11px] text-muted">{formatDateTime(p.paidAt ?? p.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-heading">{p.fullName}</p>
                    <p className="text-muted">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-heading">{rupees(p.amount)}</td>
                  <td className="px-4 py-3 capitalize text-body">{p.plan === 'full' ? 'clears balance' : p.plan === 'manual' ? 'offline' : 'part'}</td>
                  <td className="px-4 py-3">
                    <Pill tone={statusTone(p.status)}>{p.status === 'created' ? 'not finished' : p.status}</Pill>
                    {p.failureReason && <p className="mt-1 max-w-[180px] text-[11px] text-red-600">{p.failureReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted">
                    <p>{p.receipt}</p>
                    <p>{p.razorpayPaymentId ?? p.razorpayOrderId}</p>
                    {p.note && <p className="text-body">{p.note}</p>}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No payments match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pager page={page} total={data.total} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

/* ───────── Fee & Razorpay ───────── */
function FeeAndRazorpay() {
  const toast = useToast()
  const [settings, setSettings] = useState<FeeSettings | null>(null)
  const [total, setTotal] = useState('')
  const [minimum, setMinimum] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [checking, setChecking] = useState(false)

  const apply = (s: FeeSettings) => {
    setSettings(s)
    setTotal(String(s.fee.total))
    setMinimum(String(s.fee.minimum))
  }

  useEffect(() => {
    fetchFeeSettings().then(apply).catch((e) => setError(apiErrorMessage(e, 'Could not load the fee.')))
  }, [])

  const t = Number(total)
  const m = Number(minimum)
  const valid = Number.isInteger(t) && Number.isInteger(m) && t >= 100 && m >= 1 && m <= t
  const unchanged = settings && settings.fee.total === t && settings.fee.minimum === m

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveFeeSettings({ total: t, minimum: m })
      apply(await fetchFeeSettings())
      toast.success('Registration fee updated. It applies to new payments straight away.')
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the fee.'))
    } finally {
      setSaving(false)
    }
  }

  async function runCheck() {
    setChecking(true)
    try {
      setDiag(await fetchDiagnostics())
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not run the check.'))
    } finally {
      setChecking(false)
    }
  }

  if (!settings && !error) return <Loader />

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
        <div className="flex items-center gap-3">
          <Settings2 size={18} className="text-orange" />
          <h2 className="font-display text-lg font-bold text-maroon">Registration fee</h2>
        </div>
        <p className="text-[13px] text-body">
          One fee, payable in parts. The first payment must be at least the minimum; the balance can be paid later. Changes apply to the next
          payment; what members have already paid is never touched.
        </p>
        <label className="text-xs font-semibold text-heading">
          Total fee (₹)
          <input value={total} onChange={(e) => setTotal(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs font-semibold text-heading">
          Minimum first payment (₹)
          <input value={minimum} onChange={(e) => setMinimum(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputClass} mt-1`} />
        </label>
        {!valid && total !== '' && minimum !== '' && (
          <p className="text-xs text-red-600">The total must be at least ₹100, and the minimum must be between ₹1 and the total.</p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {settings?.updatedAt && (
          <p className="text-[11px] text-muted">
            Last changed {formatDateTime(settings.updatedAt)}
            {settings.updatedBy && ` by ${settings.updatedBy}`}. Default: {rupees(settings.defaults.total)} / {rupees(settings.defaults.minimum)}.
          </p>
        )}
        <div>
          <button
            type="button"
            onClick={save}
            disabled={!valid || saving || Boolean(unchanged)}
            className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save fee
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
        <div className="flex items-center gap-3">
          <PlugZap size={18} className="text-orange" />
          <h2 className="font-display text-lg font-bold text-maroon">Razorpay connection</h2>
        </div>
        <p className="text-[13px] text-body">
          Checks that the keys are set, whether they are test or live, and that Razorpay accepts them. It creates no order and shows no secret.
        </p>
        <div>
          <button type="button" onClick={runCheck} disabled={checking} className="flex items-center gap-2 rounded-lg border border-header-border px-5 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg disabled:opacity-60">
            {checking && <Loader2 size={14} className="animate-spin" />}
            Run check
          </button>
        </div>
        {diag && (
          <div className="flex flex-col gap-3 text-[13px]">
            <div className="flex flex-wrap gap-2">
              <Pill tone={diag.mode === 'live' ? 'amber' : diag.mode === 'test' ? 'grey' : 'red'}>{diag.mode} keys</Pill>
              <Pill tone={diag.apiCheck.ok ? 'green' : 'red'}>{diag.apiCheck.ok ? 'Razorpay accepts the keys' : `Razorpay check failed${diag.apiCheck.status ? ` (${diag.apiCheck.status})` : ''}`}</Pill>
              <Pill tone="grey">server: {diag.environment}</Pill>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-body">
              <dt className="text-muted">Key id</dt>
              <dd>{diag.keys.keyId ?? 'not set'}</dd>
              <dt className="text-muted">Key secret</dt>
              <dd>{diag.keys.keySecretSet ? `set (${diag.keys.keySecretLength} characters)` : 'not set'}</dd>
              <dt className="text-muted">Webhook secret</dt>
              <dd>{diag.keys.webhookSecretSet ? `set (${diag.keys.webhookSecretLength} characters)` : 'not set'}</dd>
              <dt className="text-muted">Webhook URL</dt>
              <dd className="break-all">…{diag.webhookUrl}</dd>
            </dl>
            <p className="text-body">{diag.apiCheck.message}</p>
            {diag.warnings.length > 0 && (
              <ul className="flex flex-col gap-1.5 rounded-lg bg-amber-50 p-3 text-amber-900">
                {diag.warnings.map((w) => (
                  <li key={w} className="flex gap-2">
                    <CircleAlert size={15} className="mt-0.5 shrink-0" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
