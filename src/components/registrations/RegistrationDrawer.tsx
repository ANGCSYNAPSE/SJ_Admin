import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, Check, Loader2, Trash2, X } from 'lucide-react'
import {
  deleteRegistration,
  fetchRegistration,
  runRegistrationAction,
  saveRegistrationNote,
  type RegistrationAction,
} from '../../api/registrations'
import { fetchSentNotifications } from '../../api/notifications'
import { apiErrorMessage } from '../../api/client'
import { formatDate, formatDateTime } from '../../lib/format'
import { fieldLabel, hiddenFields, isHttpUrl, isImageUrl, reminderMessage, typeLabel } from '../../lib/registrations'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'
import { CompletenessBadge, RegistrationStatusBadge } from './RegistrationBadges'
import { MessageDialog } from './MessageDialog'
import type { RegistrationDetail, RegistrationRow, RegistrationStatus, SentNotification } from '../../types/api'

const actionsByStatus: Record<RegistrationStatus, { action: RegistrationAction; label: string; tone: 'good' | 'bad' | 'neutral' }[]> = {
  pending: [
    { action: 'verify', label: 'Approve', tone: 'good' },
    { action: 'reject', label: 'Reject', tone: 'bad' },
    { action: 'block', label: 'Block', tone: 'neutral' },
  ],
  approved: [{ action: 'block', label: 'Block', tone: 'bad' }],
  rejected: [{ action: 'verify', label: 'Approve instead', tone: 'good' }],
  blocked: [{ action: 'unblock', label: 'Unblock', tone: 'good' }],
}

const toneClass = {
  good: 'bg-orange text-white hover:opacity-90',
  bad: 'border border-[#ef4444] bg-white text-[#ef4444] hover:bg-[#fdf2f2]',
  neutral: 'border border-header-border bg-white text-heading hover:bg-search-bg',
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
}

function Value({ field, value }: { field: string; value: unknown }) {
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>
  if (Array.isArray(value)) {
    const urls = value.filter(isHttpUrl)
    if (urls.length === value.length) {
      return (
        <div className="flex flex-wrap gap-2">
          {urls.map((u) =>
            isImageUrl(u) ? (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                <img src={u} alt="" className="size-14 rounded-md border border-card-border-alt object-cover" />
              </a>
            ) : (
              <a key={u} href={u} target="_blank" rel="noreferrer" className="text-orange underline">
                Open file
              </a>
            ),
          )}
        </div>
      )
    }
    return <span>{value.join(', ')}</span>
  }
  if (isImageUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer">
        <img src={value} alt={fieldLabel(field)} className="size-20 rounded-md border border-card-border-alt object-cover" />
      </a>
    )
  }
  if (isHttpUrl(value)) {
    return (
      <a href={value} target="_blank" rel="noreferrer" className="break-all text-orange underline">
        {value.includes('cloudinary') ? 'Open file' : value}
      </a>
    )
  }
  if (field === 'dateOfBirth' && typeof value === 'string') return <span>{formatDate(value)}</span>
  return <span className="whitespace-pre-line break-words">{String(value)}</span>
}

/** Everything about one registration: details, what's missing, review actions and the messages sent to them. */
export function RegistrationDrawer({
  row,
  onClose,
  onRowChange,
  onDeleted,
}: {
  row: RegistrationRow
  onClose: () => void
  onRowChange: (id: string, patch: Partial<RegistrationRow>) => void
  onDeleted: (id: string) => void
}) {
  const toast = useToast()
  const [detail, setDetail] = useState<RegistrationDetail | null>(null)
  const [history, setHistory] = useState<SentNotification[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [composer, setComposer] = useState(false)

  const loadHistory = useCallback(() => {
    fetchSentNotifications(row.userId)
      .then(setHistory)
      .catch(() => setHistory([]))
  }, [row.userId])

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    fetchRegistration(row.type, row.id)
      .then((d) => {
        if (cancelled) return
        setDetail(d)
        setNote(d.adminNote ?? '')
      })
      .catch((err) => !cancelled && setError(apiErrorMessage(err, 'Could not load this registration.')))
    loadHistory()
    return () => {
      cancelled = true
    }
  }, [row.type, row.id, loadHistory])

  const { filled, empty } = useMemo(() => {
    const entries = Object.entries(detail ?? {}).filter(([key]) => !hiddenFields.has(key))
    return {
      filled: entries.filter(([, v]) => !isBlank(v)),
      empty: entries.filter(([, v]) => isBlank(v)).map(([k]) => k),
    }
  }, [detail])

  const missing = detail?.missingFields ?? row.missing
  const isComplete = missing.length === 0

  async function act(action: RegistrationAction) {
    setBusy(action)
    try {
      const updated = await runRegistrationAction(row.type, row.id, action, note.trim() || undefined)
      setDetail((d) => (d ? { ...d, status: updated.status, adminNote: updated.adminNote } : d))
      onRowChange(row.id, { status: updated.status })
      toast.success('Status updated.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update the status.'))
    } finally {
      setBusy(null)
    }
  }

  async function saveNote() {
    setBusy('note')
    try {
      const updated = await saveRegistrationNote(row.type, row.id, note)
      setDetail((d) => (d ? { ...d, adminNote: updated.adminNote } : d))
      toast.success('Note saved.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the note.'))
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    setBusy('delete')
    try {
      await deleteRegistration(row.type, row.id)
      toast.success('Registration deleted.')
      onDeleted(row.id)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete this registration.'))
      setBusy(null)
      setConfirmDelete(false)
    }
  }

  const status = detail?.status ?? row.status

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Registration details"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[520px] flex-col overflow-y-auto bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-card-border-alt bg-white px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange">{typeLabel[row.type]}</p>
            <p className="truncate font-display text-2xl font-bold text-maroon">{row.displayName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RegistrationStatusBadge status={status} />
              <CompletenessBadge isComplete={isComplete} missing={missing} />
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="mt-1 text-muted hover:text-heading">
            <X size={20} />
          </button>
        </div>

        {error ? (
          <p className="p-6 text-sm text-red-600">{error}</p>
        ) : !detail ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-orange" />
          </div>
        ) : (
          <div className="flex flex-col gap-7 p-6">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Account</h3>
              <div className="rounded-xl border border-card-border-alt p-4 text-sm">
                <p className="font-semibold text-heading">{detail.account?.fullName ?? row.fullName}</p>
                <p className="text-body">{detail.account?.email ?? row.email}</p>
                <p className="text-body">+91 {detail.account?.mobile ?? row.phone}</p>
                <p className="mt-1 text-xs text-muted">Submitted {formatDateTime(row.createdAt)}</p>
              </div>
            </section>

            {!isComplete && (
              <section className="flex flex-col gap-3 rounded-xl border border-[#f6d2b3] bg-[#fff8f1] p-4">
                <div>
                  <p className="text-sm font-semibold text-heading">This profile is incomplete</p>
                  <p className="mt-1 text-[13px] text-body">Still missing: {missing.map(fieldLabel).join(', ')}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposer(true)}
                  className="flex w-fit items-center gap-2 rounded-lg bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                >
                  <BellRing size={14} /> Remind them to finish
                </button>
              </section>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Review</h3>
              <div className="flex flex-wrap gap-2">
                {actionsByStatus[status].map(({ action, label, tone }) => (
                  <button
                    key={action}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => act(action)}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${toneClass[tone]}`}
                  >
                    {busy === action ? <Loader2 size={13} className="animate-spin" /> : action === 'verify' || action === 'unblock' ? <Check size={13} /> : null}
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setComposer(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-header-border bg-white px-4 py-2 text-[13px] font-semibold text-heading hover:bg-search-bg"
                >
                  <BellRing size={13} /> Send message
                </button>
              </div>
              <label htmlFor="admin-note" className="mt-2 text-xs font-medium text-heading">
                Internal note <span className="text-muted">(only admins see this)</span>
              </label>
              <textarea
                id="admin-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full resize-none rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none"
                placeholder="e.g. Called on Monday, waiting for the trust certificate."
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={busy !== null || note === (detail.adminNote ?? '')}
                className="w-fit rounded-lg border border-header-border bg-white px-4 py-2 text-[13px] font-semibold text-heading hover:bg-search-bg disabled:opacity-50"
              >
                {busy === 'note' ? 'Saving…' : 'Save note'}
              </button>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Details</h3>
              {filled.length === 0 ? (
                <p className="text-sm text-muted">Nothing filled in yet.</p>
              ) : (
                <dl className="divide-y divide-card-border-alt rounded-xl border border-card-border-alt">
                  {filled.map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[140px_1fr] gap-3 px-4 py-2.5 text-sm">
                      <dt className="text-body">{fieldLabel(key)}</dt>
                      <dd className="min-w-0 text-heading">
                        <Value field={key} value={value} />
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {empty.length > 0 && (
                <p className="text-xs leading-relaxed text-muted">
                  Not provided:{' '}
                  {empty.map((key, i) => (
                    <span key={key} className={missing.includes(key) ? 'font-semibold text-orange' : ''}>
                      {fieldLabel(key)}
                      {i < empty.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Messages sent</h3>
              {history.length === 0 ? (
                <p className="text-sm text-muted">You haven&apos;t sent them anything yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {history.map((n) => (
                    <li key={n.id} className="rounded-xl border border-card-border-alt p-3 text-sm">
                      {n.title && <p className="font-semibold text-heading">{n.title}</p>}
                      <p className="text-body">{n.message}</p>
                      <p className="mt-1 text-xs text-muted">
                        {formatDateTime(n.createdAt)} · {n.readAt ? `seen ${formatDateTime(n.readAt)}` : 'not seen yet'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2 border-t border-card-border-alt pt-5">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={busy !== null}
                className="flex w-fit items-center gap-2 text-[13px] font-semibold text-[#ef4444] hover:underline disabled:opacity-50"
              >
                <Trash2 size={14} /> Delete this registration
              </button>
              <p className="text-xs text-muted">The person&apos;s login account is kept; only this {typeLabel[row.type].toLowerCase()} profile is removed.</p>
            </section>
          </div>
        )}
      </aside>

      {confirmDelete && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Delete this registration?"
            description={`"${row.displayName}" will be removed. The person's account stays, and they can register again.`}
            confirmLabel="Delete"
            isConfirming={busy === 'delete'}
            onConfirm={remove}
            onCancel={() => setConfirmDelete(false)}
          />
        </div>
      )}

      {composer && (
        <div onClick={(e) => e.stopPropagation()}>
          <MessageDialog
            recipients={[{ userId: row.userId, name: row.fullName }]}
            initialKind={isComplete ? 'info' : 'warning'}
            initialMessage={isComplete ? '' : reminderMessage(row.fullName.split(' ')[0], row.type, missing)}
            initialLink={isComplete ? '' : '/complete-profile'}
            onClose={() => setComposer(false)}
            onSent={loadHistory}
          />
        </div>
      )}
    </div>
  )
}
