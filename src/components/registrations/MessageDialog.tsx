import { useState } from 'react'
import { BellRing, Loader2, X } from 'lucide-react'
import { sendNotification } from '../../api/notifications'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../ui/Toast'
import type { NotificationKind } from '../../types/api'

export interface Recipient {
  userId: string
  name: string
}

const kinds: { value: NotificationKind; label: string; hint: string }[] = [
  { value: 'info', label: 'Info', hint: 'A neutral note' },
  { value: 'warning', label: 'Needs attention', hint: 'Asks them to do something' },
  { value: 'success', label: 'Good news', hint: 'Approvals, thanks' },
]

const links = [
  { value: '', label: 'No link' },
  { value: '/complete-profile', label: 'Complete-profile page' },
  { value: '/profile', label: 'My profile (pay the fee)' },
  { value: '/', label: 'Home page' },
]

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

/**
 * Compose a message that each recipient sees as a toast on the site the next
 * time they are signed in. Used for one person (from the detail panel) or
 * several (from the table's selection).
 */
export function MessageDialog({
  recipients,
  initialMessage = '',
  initialKind = 'info',
  initialLink = '',
  onClose,
  onSent,
}: {
  recipients: Recipient[]
  initialMessage?: string
  initialKind?: NotificationKind
  initialLink?: string
  onClose: () => void
  onSent: (count: number) => void
}) {
  const toast = useToast()
  const [message, setMessage] = useState(initialMessage)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<NotificationKind>(initialKind)
  const [link, setLink] = useState(initialLink)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (message.trim() === '') {
      setError('Write a message first.')
      return
    }
    setError(null)
    setIsSending(true)
    try {
      const result = await sendNotification({
        userIds: recipients.map((r) => r.userId),
        message: message.trim(),
        title: title.trim() || undefined,
        kind,
        link: link || undefined,
      })
      toast.success(result.message)
      onSent(result.data.sent)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the message.'))
    } finally {
      setIsSending(false)
    }
  }

  const who =
    recipients.length === 1 ? recipients[0].name : `${recipients.length} people (${recipients.slice(0, 2).map((r) => r.name).join(', ')}${recipients.length > 2 ? ', …' : ''})`

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-lg flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-tint">
              <BellRing size={20} className="text-orange" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-maroon">Send a message</p>
              <p className="text-[13px] text-body">To {who}. They&apos;ll see it as a notification on the site.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-heading">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-heading">Type</p>
          <div className="grid grid-cols-3 gap-2">
            {kinds.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  kind === k.value ? 'border-orange bg-[#fff1e6]' : 'border-card-border hover:border-orange/50'
                }`}
              >
                <p className="text-[13px] font-semibold text-heading">{k.label}</p>
                <p className="text-[11px] text-muted">{k.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg-title" className="text-xs font-medium text-heading">
            Title <span className="text-muted">(optional)</span>
          </label>
          <input id="msg-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. One more step" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg-body" className="flex items-center justify-between text-xs font-medium text-heading">
            Message
            <span className="font-normal text-muted">{message.length}/500</span>
          </label>
          <textarea
            id="msg-body"
            value={message}
            maxLength={500}
            rows={4}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} resize-none`}
            placeholder="Write what you want them to see…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="msg-link" className="text-xs font-medium text-heading">
            Button link <span className="text-muted">(optional)</span>
          </label>
          <select id="msg-link" value={link} onChange={(e) => setLink(e.target.value)} className={inputClass}>
            {links.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-header-border bg-white px-5 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={isSending}
            className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSending && <Loader2 size={14} className="animate-spin" />}
            Send message
          </button>
        </div>
      </div>
    </div>
  )
}
