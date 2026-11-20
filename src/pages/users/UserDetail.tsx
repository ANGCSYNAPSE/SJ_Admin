import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BellRing, ExternalLink, Loader2, ShieldCheck, ShieldOff, SquarePen, UserRoundX, UserRoundCheck } from 'lucide-react'
import { fetchUser, setUserBlocked } from '../../api/users'
import { fetchRegistration } from '../../api/registrations'
import { fetchSentNotifications } from '../../api/notifications'
import { fetchVerificationDetail, setVerified, type VerificationDetail } from '../../api/verification'
import { fetchPaymentDocument, saveBlob, type DocumentKind } from '../../api/documents'
import { DocumentButtons, DocumentPreview } from '../../components/payments/DocumentPreview'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { formatDate, formatDateTime } from '../../lib/format'
import { fieldLabel, hiddenFields, typeLabel } from '../../lib/registrations'
import { formatLastActive, roleLabel, userStatus } from '../../lib/users'
import { MessageDialog } from '../../components/registrations/MessageDialog'
import { CompletenessBadge, RegistrationStatusBadge } from '../../components/registrations/RegistrationBadges'
import { Value, isBlank } from '../../components/registrations/RegistrationDrawer'
import { UserStatusBadge } from '../../components/users/UserStatusBadge'
import { VerificationBadges } from '../../components/verification/VerificationBadges'
import { Loader } from '../../components/ui/Loader'
import { useToast } from '../../components/ui/Toast'
import type { AdminUser, RegistrationDetail, RegistrationType, SentNotification } from '../../types/api'

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-card-border-alt bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-maroon">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="mt-0.5 break-words text-sm text-heading">{children}</div>
    </div>
  )
}

/** One registration with everything the person gave us, photos and documents included. */
function RegistrationCard({ registration }: { registration: { id: string; type: RegistrationType } }) {
  const [detail, setDetail] = useState<RegistrationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRegistration(registration.type, registration.id).then(setDetail).catch((e) => setError(apiErrorMessage(e, 'Could not load this registration.')))
  }, [registration.id, registration.type])

  const { filled, empty } = useMemo(() => {
    const entries = Object.entries(detail ?? {}).filter(([key]) => !hiddenFields.has(key))
    return { filled: entries.filter(([, v]) => !isBlank(v)), empty: entries.filter(([, v]) => isBlank(v)).map(([k]) => k) }
  }, [detail])

  if (error) return <p className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>
  if (!detail) return <div className="h-24 animate-pulse rounded-lg bg-search-bg" />

  return (
    <div className="rounded-lg border border-card-border bg-[#fffbf3] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base font-bold text-maroon">{typeLabel[registration.type]}</p>
          <RegistrationStatusBadge status={detail.status} />
          <CompletenessBadge isComplete={detail.missingFields.length === 0} missing={detail.missingFields} />
        </div>
        <Link to="/registrations" className="flex items-center gap-1 text-[12px] font-semibold text-orange hover:underline">
          Review in Registrations <ExternalLink size={12} />
        </Link>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {filled.map(([key, value]) => (
          <div key={key} className={Array.isArray(value) || (typeof value === 'string' && value.length > 60) ? 'sm:col-span-2' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{fieldLabel(key)}</dt>
            <dd className="mt-1 text-sm text-heading">
              <Value field={key} value={value} />
            </dd>
          </div>
        ))}
      </dl>
      {empty.length > 0 && (
        <p className="mt-4 text-[12px] text-muted">
          Not filled in yet: <span className="text-body">{empty.map(fieldLabel).join(', ')}</span>
        </p>
      )}
      {detail.adminNote && (
        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[12px] text-body">
          <b>Admin note:</b> {detail.adminNote}
        </p>
      )}
    </div>
  )
}

/** A person's whole file in one page: who they are, how they are verified, what they registered, paid and were sent. */
export function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [file, setFile] = useState<VerificationDetail | null>(null)
  const [sent, setSent] = useState<SentNotification[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [messaging, setMessaging] = useState(false)
  const [doc, setDoc] = useState<{ id: string; kind: DocumentKind; title: string; fileName: string } | null>(null)

  async function download(paymentId: string, kind: DocumentKind, fileName: string) {
    try {
      saveBlob(await fetchPaymentDocument(paymentId, kind), fileName)
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not download this document.'))
    }
  }

  const load = useCallback(() => {
    if (!id) return
    Promise.all([fetchUser(id), fetchVerificationDetail(id).catch(() => null), fetchSentNotifications(id).catch(() => [] as SentNotification[])])
      .then(([u, v, n]) => {
        setUser(u)
        setFile(v)
        setSent(n)
      })
      .catch((e) => setError(apiErrorMessage(e, 'Could not load this person.')))
  }, [id])

  useEffect(load, [load])

  async function toggleVerified(verified: boolean) {
    if (!id) return
    setBusy('verify')
    try {
      toast.success((await setVerified(id, verified)).message)
      load()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update this account.'))
    } finally {
      setBusy(null)
    }
  }

  async function toggleSuspended() {
    if (!user) return
    setBusy('block')
    try {
      await setUserBlocked(user.id, !user.isBlocked)
      toast.success(user.isBlocked ? 'Account reactivated.' : 'Account suspended.')
      load()
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change this account.'))
    } finally {
      setBusy(null)
    }
  }

  if (error)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        <button type="button" onClick={() => navigate('/users')} className="text-sm font-semibold text-orange">
          Back to users
        </button>
      </div>
    )
  if (!user) return <Loader />

  const isAdmin = user.role === 'admin'
  const photo = resolveUploadUrl(user.avatarUrl)
  const status = userStatus(user)

  return (
    <div className="flex flex-col gap-5">
      <Link to="/users" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-orange hover:underline">
        <ArrowLeft size={15} /> All users
      </Link>

      {/* Who they are */}
      <section className="flex flex-wrap items-start gap-5 rounded-xl border border-card-border-alt bg-white p-5">
        {photo ? (
          <img src={photo} alt={user.fullName} className="size-24 shrink-0 rounded-full border-4 border-[#fde9c8] object-cover" />
        ) : (
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-[#fde9c8] font-display text-4xl font-bold text-maroon">
            {user.fullName.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-maroon">{user.fullName}</h1>
            <UserStatusBadge status={status} />
            <span className="rounded-full bg-search-bg px-2.5 py-0.5 text-[11px] font-bold text-body">{roleLabel[user.role]}</span>
          </div>
          <p className="mt-1 text-sm text-body">
            {user.email} · {user.mobile}
            {user.location ? ` · ${user.location}` : ''}
          </p>
          <div className="mt-3">
            {file ? (
              <VerificationBadges
                emailVerified={file.emailVerified}
                mobileVerified={file.mobileVerified}
                isVerified={file.isVerified}
                emailVerifiedAt={file.emailVerifiedAt}
                mobileVerifiedAt={file.mobileVerifiedAt}
                verifiedAt={file.verifiedAt}
              />
            ) : (
              <p className="text-[12px] text-muted">Verification marks apply to member accounts.</p>
            )}
          </div>
          {file?.isVerified && file.verifiedAt && (
            <p className="mt-1.5 text-[12px] text-muted">
              Verified by {file.verifiedBy ?? 'an admin'} on {formatDateTime(file.verifiedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {file && !isAdmin && (
            <button
              type="button"
              disabled={busy === 'verify'}
              onClick={() => toggleVerified(!file.isVerified)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
                file.isVerified ? 'border border-card-border bg-white text-heading' : 'bg-green-600 text-white'
              }`}
            >
              {busy === 'verify' ? <Loader2 size={14} className="animate-spin" /> : file.isVerified ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
              {file.isVerified ? 'Remove verification' : 'Verify account'}
            </button>
          )}
          <button type="button" onClick={() => setMessaging(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-orange px-4 py-2 text-sm font-semibold text-white">
            <BellRing size={14} /> Send notification
          </button>
          <Link to={`/users/${user.id}/edit`} className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-heading">
            <SquarePen size={14} /> Edit
          </Link>
          {!isAdmin && (
            <button
              type="button"
              disabled={busy === 'block'}
              onClick={toggleSuspended}
              className="inline-flex items-center gap-1.5 rounded-lg border border-card-border bg-white px-4 py-2 text-sm font-semibold text-heading disabled:opacity-60"
            >
              {user.isBlocked ? <UserRoundCheck size={14} /> : <UserRoundX size={14} />}
              {user.isBlocked ? 'Reactivate' : 'Suspend'}
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {/* What they registered */}
          <Card title="Registrations">
            {file && file.registrations.length > 0 ? (
              <div className="flex flex-col gap-4">
                {file.registrations.map((r) => (
                  <RegistrationCard key={r.id} registration={r} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-body">{isAdmin ? 'Administrators have no registrations.' : 'A plain member: no category registrations yet.'}</p>
            )}
          </Card>

          {/* What they were sent */}
          <Card
            title="Notifications sent to them"
            action={
              <button type="button" onClick={() => setMessaging(true)} className="text-[13px] font-semibold text-orange hover:underline">
                Send one
              </button>
            }
          >
            {sent.length === 0 ? (
              <p className="text-sm text-body">Nothing has been sent to this person yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-card-border-alt">
                {sent.slice(0, 10).map((n) => (
                  <li key={n.id} className="py-2.5 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-heading">{n.title ?? 'Message'}</p>
                      <span className="shrink-0 text-[11px] text-muted">{formatDateTime(n.createdAt)}</span>
                    </div>
                    <p className="text-body">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{n.readAt ? `Read ${formatDateTime(n.readAt)}` : 'Not read yet'}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          {/* The account itself */}
          <Card title="Account">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field label="Full name">{user.fullName}</Field>
              <Field label="Email">{user.email}</Field>
              <Field label="Mobile">{user.mobile}</Field>
              <Field label="Location">{user.location || <span className="text-muted">Not added</span>}</Field>
              <Field label="Joined">{formatDate(user.createdAt)}</Field>
              <Field label="Last active">{formatLastActive(user.lastLoginAt)}</Field>
              <Field label="Signs in with">{file?.googleLinked ? 'Email and password, or Google' : 'Email and password'}</Field>
              <Field label="Account ID">
                <span className="font-mono text-[12px] text-body">{user.id}</span>
              </Field>
            </div>
          </Card>

          {/* What they paid */}
          {file && !isAdmin && (
            <Card
              title="Registration fee"
              action={
                <Link to="/payments" className="text-[13px] font-semibold text-orange hover:underline">
                  Payments
                </Link>
              }
            >
              <p className={`text-sm font-semibold ${file.paid >= file.fee.minimum ? 'text-green-700' : 'text-amber-700'}`}>
                {rupees(file.paid)} paid of {rupees(file.fee.total)}
              </p>
              {file.payments.some((p) => p.status === 'paid') && (
                <div className="mt-2">
                  {(() => {
                    const first = file.payments.find((p) => p.status === 'paid')!
                    return (
                      <DocumentButtons
                        label="Invoice"
                        onPreview={() => setDoc({ id: first.id, kind: 'invoice', title: `Invoice for ${user.fullName}`, fileName: `Shyam-Jagat-Invoice-${user.fullName.replace(/\s+/g, '-')}` })}
                        onDownload={() => download(first.id, 'invoice', `Shyam-Jagat-Invoice-${user.fullName.replace(/\s+/g, '-')}`)}
                      />
                    )
                  })()}
                </div>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-orange" style={{ width: `${Math.min(100, Math.round((file.paid / file.fee.total) * 100))}%` }} />
              </div>
              {file.payments.length === 0 ? (
                <p className="mt-3 text-sm text-body">No payments yet.</p>
              ) : (
                <ul className="mt-3 flex flex-col divide-y divide-card-border-alt text-[13px]">
                  {file.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-body">
                        {rupees(p.amount)}
                        {p.source === 'manual' && ' (offline)'}
                        <span className="ml-1 text-[11px] text-muted">{formatDate(p.paidAt ?? p.createdAt)}</span>
                      </span>
                      <span className="text-right">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {p.status === 'created' ? 'not finished' : p.status}
                        </span>
                        {p.refunded > 0 && <span className="ml-1.5 text-[11px] font-semibold text-red-600">{rupees(p.refunded)} refunded</span>}
                        {p.status === 'paid' && (
                          <span className="mt-1.5 block">
                            <DocumentButtons
                              label="Receipt"
                              onPreview={() => setDoc({ id: p.id, kind: 'receipt', title: `Receipt, ${rupees(p.amount)} on ${formatDate(p.paidAt ?? p.createdAt)}`, fileName: `Shyam-Jagat-Receipt-${p.id.slice(0, 8)}` })}
                              onDownload={() => download(p.id, 'receipt', `Shyam-Jagat-Receipt-${p.id.slice(0, 8)}`)}
                            />
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>

      {doc && <DocumentPreview title={doc.title} fileName={doc.fileName} load={() => fetchPaymentDocument(doc.id, doc.kind)} onClose={() => setDoc(null)} />}
      {messaging && <MessageDialog recipients={[{ userId: user.id, name: user.fullName }]} onClose={() => setMessaging(false)} onSent={load} />}
    </div>
  )
}
