import { useEffect, useState } from 'react'
import { CircleAlert, Loader2, Undo2, X } from 'lucide-react'
import { fetchFeeSettings, fetchPayments, refundFee, refundPayment, type PaymentRow, type RefundResult } from '../../api/payments'
import { apiErrorMessage } from '../../api/client'
import { formatDate } from '../../lib/format'
import { useToast } from '../ui/Toast'

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

/** Refund all or part of a paid registration fee. Razorpay payments go back to the customer's own account. */
export function RefundDialog({ payment, onClose, onDone }: { payment: PaymentRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const leftOnThis = Math.round((payment.amount - (payment.refunded ?? 0)) * 100) / 100

  // Everything this person has paid: a fee is often paid in parts, and the admin may want to give it all back.
  const [others, setOthers] = useState<PaymentRow[] | null>(null)
  useEffect(() => {
    fetchPayments({ status: 'paid', userId: payment.userId ?? undefined, page: 1, limit: 50 })
      .then((page) => setOthers(page.items))
      .catch(() => setOthers([]))
  }, [payment.userId])
  const [feeTotal, setFeeTotal] = useState<number | null>(null)
  useEffect(() => {
    fetchFeeSettings()
      .then((settings) => setFeeTotal(settings.fee.total))
      .catch(() => setFeeTotal(null))
  }, [])
  // Where this person stands now: what they paid, what has gone back, and what they still owe.
  const paidGross = Math.round((others ?? []).reduce((sum, p) => sum + p.amount, 0) * 100) / 100
  const refundedSoFar = Math.round((others ?? []).reduce((sum, p) => sum + (p.refunded ?? 0), 0) * 100) / 100
  const paidNet = Math.round((paidGross - refundedSoFar) * 100) / 100
  const balanceNow = feeTotal === null ? null : Math.max(Math.round((feeTotal - paidNet) * 100) / 100, 0)
  const refundable = (others ?? []).filter((p) => p.amount - (p.refunded ?? 0) > 0)
  const leftOnAll = Math.round(refundable.reduce((sum, p) => sum + (p.amount - (p.refunded ?? 0)), 0) * 100) / 100
  const canRefundAll = refundable.length > 1 && payment.userId !== null
  const [scope, setScope] = useState<'one' | 'all'>('one')
  const left = scope === 'all' ? leftOnAll : leftOnThis
  const [amount, setAmount] = useState(String(leftOnThis))
  // Once the person's other payments are known, offer to refund the whole fee by default.
  useEffect(() => {
    if (canRefundAll) {
      setScope('all')
      setAmount(String(leftOnAll))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRefundAll, leftOnAll])
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Once the refund is made, the window turns into a confirmation instead of closing.
  const [done, setDone] = useState<RefundResult | null>(null)

  const value = Number(amount)
  const valid = Number.isFinite(value) && value > 0 && value <= left
  // Leftover from the old dummy checkout: Razorpay never saw it, so the refund is only recorded here.
  const mock = /^pay_mock_/.test(payment.razorpayPaymentId ?? '')
  const online = payment.source === 'razorpay' && !mock

  async function submit() {
    if (reason.trim().length < 3) {
      setError('Write the reason, so the record makes sense later.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res =
        scope === 'all' && payment.userId
          ? await refundFee({ userId: payment.userId, amount: value === left ? undefined : value, reason: reason.trim() })
          : await refundPayment(payment.id, { amount: value === left ? undefined : value, reason: reason.trim() })
      toast.success(res.message)
      setDone(res)
      onDone()
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not refund this payment.'))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    const title = done.status === 'recorded' ? 'Refund recorded' : done.status === 'pending' ? 'Refund started' : 'Refund completed'
    const statusLabel = done.status === 'recorded' ? 'Recorded' : done.status === 'pending' ? 'In progress at Razorpay' : 'Completed'
    return (
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white px-6 pb-6 pt-8 text-center shadow-xl">
          <span className="flex size-20 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
            <svg viewBox="0 0 24 24" className="size-11 text-green-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-maroon">{title}</p>
            <p className="mt-1 text-3xl font-bold text-heading">{rupees(done.total)}</p>
            <p className="text-[13px] text-body">
              to {payment.fullName}
              {done.payments > 1 ? ` · across ${done.payments} payments` : ''}
            </p>
          </div>

          <dl className="w-full divide-y divide-card-border-alt rounded-xl border border-card-border-alt text-left text-[13px]">
            <div className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Status</dt>
              <dd className="font-semibold text-green-700">{statusLabel}</dd>
            </div>
            {done.reference && (
              <div className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-muted">Razorpay reference</dt>
                <dd className="break-all text-right font-mono text-[12px] text-heading">{done.reference}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Counts as paid now</dt>
              <dd className="font-semibold text-heading">{rupees(done.fee.paid)} of {rupees(done.fee.total)}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Balance still due</dt>
              <dd className={`font-semibold ${done.fee.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>{rupees(done.fee.balance)}</dd>
            </div>
            <div className="flex justify-between gap-3 px-4 py-2.5">
              <dt className="text-muted">Member</dt>
              <dd className="text-heading">Notified in their bell and by email</dd>
            </div>
          </dl>

          <p className="text-[12px] text-body">
            {done.status === 'recorded'
              ? 'This refund is noted in the records. Nothing was sent through Razorpay.'
              : 'The money returns to the payer’s own bank, card or UPI account, usually within 5 to 7 working days. Razorpay keeps its own fee.'}
          </p>

          {done.belowMinimum && (
            <p className="flex w-full items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-[12px] text-amber-800">
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              They are now below the minimum fee. You may want to un-verify them or send a message.
            </p>
          )}

          <button type="button" onClick={onClose} autoFocus className="w-full rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-tint">
              <Undo2 size={20} className="text-orange" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-maroon">Refund payment</p>
              <p className="text-[13px] text-body">
                {payment.fullName} paid {rupees(payment.amount)} in this payment
                {payment.refunded > 0 && ` (${rupees(payment.refunded)} already refunded)`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-heading">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-card-border-alt bg-[#fffbf3] px-4 py-3 text-[13px]">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{payment.fullName.split(' ')[0]}&apos;s registration fee</p>
          {others === null ? (
            <p className="text-muted">Loading what they paid…</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
              <dt className="text-body">Registration fee</dt>
              <dd className="text-right font-semibold text-heading">{feeTotal === null ? '–' : rupees(feeTotal)}</dd>
              <dt className="text-body">Total paid (all payments)</dt>
              <dd className="text-right font-semibold text-heading">{rupees(paidGross)}</dd>
              <dt className="text-body">Total refunded</dt>
              <dd className="text-right font-semibold text-red-600">{refundedSoFar > 0 ? `− ${rupees(refundedSoFar)}` : rupees(0)}</dd>
              <dt className="border-t border-card-border-alt pt-1 text-body">Remaining (can still be refunded)</dt>
              <dd className="border-t border-card-border-alt pt-1 text-right font-bold text-green-700">{rupees(paidNet)}</dd>
              <dt className="text-body">Balance still due</dt>
              <dd className={`text-right font-bold ${balanceNow && balanceNow > 0 ? 'text-red-600' : 'text-green-700'}`}>{balanceNow === null ? '–' : rupees(balanceNow)}</dd>
            </dl>
          )}
          {others !== null && others.length > 0 && (
            <ul className="mt-2.5 divide-y divide-card-border-alt border-t border-card-border-alt text-[12px]">
              {others.map((p) => (
                <li key={p.id} className={`flex items-center justify-between gap-3 py-1.5 ${p.id === payment.id ? 'font-semibold text-heading' : 'text-body'}`}>
                  <span>
                    {rupees(p.amount)} <span className="text-muted">paid {formatDate(p.paidAt ?? p.createdAt)}</span>
                    {p.id === payment.id && <span className="ml-1.5 rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] font-bold text-orange">this one</span>}
                  </span>
                  <span className="text-right">
                    {p.refunded > 0 && <span className="text-red-600">{rupees(p.refunded)} refunded · </span>}
                    <b>{rupees(Math.round((p.amount - (p.refunded ?? 0)) * 100) / 100)} left</b>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canRefundAll && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What to refund">
            {(
              [
                ['all', `Everything ${payment.fullName.split(' ')[0]} paid`, `${rupees(leftOnAll)} across ${refundable.length} payments`],
                ['one', 'Only this payment', rupees(leftOnThis)],
              ] as const
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={scope === value}
                onClick={() => {
                  setScope(value)
                  setAmount(String(value === 'all' ? leftOnAll : leftOnThis))
                }}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${scope === value ? 'border-orange bg-[#fff1e6]' : 'border-card-border hover:border-orange/50'}`}
              >
                <p className="text-[13px] font-semibold text-heading">{title}</p>
                <p className="text-[11px] text-muted">{hint}</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-heading" htmlFor="refund-amount">
            Amount to refund <span className="font-normal text-muted">(up to {rupees(left)})</span>
          </label>
          <input id="refund-amount" type="number" min={1} max={left} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          {valid && others !== null && (
            <p className="rounded-lg bg-search-bg px-3 py-2 text-[12px] text-body">
              After this refund:{' '}
              <b className="text-heading">{rupees(Math.max(Math.round((paidNet - value) * 100) / 100, 0))} counts as paid</b>
              {balanceNow !== null && feeTotal !== null && (
                <>
                  {' · '}
                  balance due <b className="text-red-600">{rupees(Math.max(Math.round((feeTotal - (paidNet - value)) * 100) / 100, 0))}</b>
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-heading" htmlFor="refund-reason">
            Reason <span className="font-normal text-muted">(kept in the record)</span>
          </label>
          <input id="refund-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="e.g. Paid twice by mistake" />
        </div>

        <p className="rounded-lg bg-search-bg px-3 py-2 text-[12px] text-body">
          {mock
            ? 'This is a leftover test payment from the old dummy checkout. Razorpay never received it, so nothing is sent to Razorpay. The refund is recorded here, and the member is still notified and emailed.'
            : online
            ? 'The money goes back to the payer’s own bank, card or UPI account through Razorpay, usually in 5 to 7 working days. Razorpay keeps its own fee. This cannot be undone.'
            : 'This payment was recorded by hand, so nothing is sent through Razorpay. Return the money yourself, this only updates the record.'}
        </p>
        <p className="text-[12px] text-muted">They will see a “Refund initiated” note in their notification bell.</p>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-card-border px-4 py-2 text-sm font-semibold text-heading">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={busy || !valid} className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Refund {valid ? rupees(value) : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
