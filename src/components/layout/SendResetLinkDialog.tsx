import { useState } from 'react'
import { KeyRound, Loader2, X } from 'lucide-react'
import { forgotPassword } from '../../api/auth'
import { apiErrorMessage } from '../../api/client'
import { useToast } from '../ui/Toast'

/**
 * Asks for confirmation, then sends the signed-in admin a password-reset link
 * at their own email (the same flow as "Forgot password?" on the login page).
 */
export function SendResetLinkDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const toast = useToast()
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setError(null)
    setIsSending(true)
    try {
      await forgotPassword(email)
      toast.success(`A password reset link is on its way to ${email}.`)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link. Please try again.'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Reset password"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-icon-tint">
              <KeyRound size={20} className="text-orange" />
            </div>
            <p className="font-display text-xl font-bold text-maroon">Reset your password</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-heading">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-heading">
          We&apos;ll email a link to <span className="font-semibold">{email}</span>. Open it to choose a new password. The link
          works once and expires in 30 minutes.
        </p>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-header-border bg-white px-5 py-2.5 text-[13px] font-semibold text-heading transition-colors hover:bg-search-bg disabled:opacity-60"
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
            Send reset link
          </button>
        </div>
      </div>
    </div>
  )
}
