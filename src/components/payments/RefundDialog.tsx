import { useState } from 'react'
import { Loader2, Undo2, X } from 'lucide-react'
import { refundPayment, type PaymentRow } from '../../api/payments'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../ui/Toast'

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

/** Refund all or part of a paid registration fee. Razorpay payments go back to the customer's own account. */
export function RefundDialog({ payment, onClose, onDone }: { payment: PaymentRow; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const left = Math.round((payment.amount - (payment.refunded ?? 0)) * 100) / 100
  const [amount, setAmount] = useState(String(left))
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const res = await refundPayment(payment.id, { amount: value === left ? undefined : value, reason: reason.trim() })
      toast.success(res.message)
      if (res.belowMinimum) toast.success('They are now below the minimum fee. You may want to un-verify or message them.')
      onDone()
      onClose()
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not refund this payment.'))
    } finally {
      setBusy(false)
    }
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
                {payment.fullName} paid {rupees(payment.amount)}
                {payment.refunded > 0 && ` (${rupees(payment.refunded)} already refunded)`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-heading">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-heading" htmlFor="refund-amount">
            Amount to refund <span className="font-normal text-muted">(up to {rupees(left)})</span>
          </label>
          <input id="refund-amount" type="number" min={1} max={left} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
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
