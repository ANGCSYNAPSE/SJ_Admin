import { useCallback, useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { fetchVerificationDetail, setVerified, type VerificationDetail } from '../../api/verification'
import { apiErrorMessage } from '../../api/client'
import { formatDate, formatDateTime } from '../../lib/format'
import { typeLabel } from '../../lib/registrations'
import { useToast } from '../ui/Toast'
import { VerificationBadges } from './VerificationBadges'

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** On a person's page: email, phone and admin verification, what they paid, and what they registered for. */
export function UserVerificationCard({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const toast = useToast()
  const [detail, setDetail] = useState<VerificationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchVerificationDetail(userId)
      .then(setDetail)
      .catch((e) => setError(apiErrorMessage(e, 'Could not load the verification details.')))
  }, [userId])

  useEffect(load, [load])

  async function toggle(verified: boolean) {
    setBusy(true)
    try {
      const res = await setVerified(userId, verified)
      toast.success(res.message)
      load()
      onChanged?.()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update this account.'))
    } finally {
      setBusy(false)
    }
  }

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>
  if (!detail) return <div className="h-28 animate-pulse rounded-xl bg-search-bg" />
  // Admin accounts are not verified by anyone else.
  if (detail.role === 'admin') return null

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-card-border bg-[#fffbf3] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold text-maroon">Verification</p>
          <p className="text-[12px] text-muted">Joined {formatDate(detail.createdAt)}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => toggle(!detail.isVerified)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
            detail.isVerified ? 'border border-card-border bg-white text-heading' : 'bg-green-600 text-white'
          }`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : detail.isVerified ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
          {detail.isVerified ? 'Remove admin verification' : 'Verify this account'}
        </button>
      </div>

      <VerificationBadges
        emailVerified={detail.emailVerified}
        mobileVerified={detail.mobileVerified}
        isVerified={detail.isVerified}
        emailVerifiedAt={detail.emailVerifiedAt}
        mobileVerifiedAt={detail.mobileVerifiedAt}
        verifiedAt={detail.verifiedAt}
      />
      {detail.isVerified && detail.verifiedAt && (
        <p className="-mt-2 text-[12px] text-muted">
          Verified by {detail.verifiedBy ?? 'an admin'} on {formatDateTime(detail.verifiedAt)}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Registered as</p>
          {detail.registrations.length === 0 ? (
            <p className="text-[13px] text-body">Plain member (no category).</p>
          ) : (
            <ul className="flex flex-col gap-1 text-[13px] text-body">
              {detail.registrations.map((r, i) => (
                <li key={i}>
                  <b>{typeLabel[r.type]}</b> · {r.name} <span className="capitalize text-muted">({r.status})</span>
                  {!r.complete && <span className="ml-1 text-amber-700">· {r.missing} detail{r.missing === 1 ? '' : 's'} missing</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">Registration fee</p>
          <p className={`text-[13px] font-semibold ${detail.paid >= detail.fee.minimum ? 'text-green-700' : 'text-amber-700'}`}>
            {rupees(detail.paid)} paid of {rupees(detail.fee.total)}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5 text-[12px] text-body">
            {detail.payments
              .filter((p) => p.status === 'paid')
              .map((p) => (
                <li key={p.id}>
                  {rupees(p.amount)} on {formatDate(p.paidAt ?? p.createdAt)}
                  {p.source === 'manual' && ' (offline)'}
                  {p.refunded > 0 && <span className="text-red-600"> · {rupees(p.refunded)} refunded</span>}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
