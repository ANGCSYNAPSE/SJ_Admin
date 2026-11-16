import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, TriangleAlert } from 'lucide-react'
import { resetPassword } from '../../api/auth'
import { apiErrorMessage } from '../../api/client'
import { AuthCard } from '../../components/auth/AuthCard'

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 pr-10 text-sm text-heading focus:border-orange focus:outline-none'

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-heading">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-heading"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )
}

export function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) return setError('Passwords do not match.')
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Password must be at least 8 characters and include a letter and a number.')
    }

    setIsSubmitting(true)
    try {
      await resetPassword(token ?? '', password, confirmPassword)
      setIsDone(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not reset your password. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
    return (
      <AuthCard
        title="Invalid reset link"
        subtitle="This link is missing its reset token. Request a new one to continue."
        icon={<TriangleAlert size={26} />}
      >
        <Link
          to="/forgot-password"
          className="block rounded-lg bg-orange py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          Request a new link
        </Link>
      </AuthCard>
    )
  }

  if (isDone) {
    return (
      <AuthCard
        title="Password updated"
        subtitle="Your password has been changed. You can now sign in with your new password."
        icon={<CheckCircle2 size={26} />}
      >
        <Link
          to="/login"
          className="block rounded-lg bg-orange py-2.5 text-center text-sm font-semibold text-white hover:opacity-90"
        >
          Go to sign in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose a strong password you have not used before."
      icon={<LockKeyhole size={26} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <PasswordField id="password" label="New password" value={password} onChange={setPassword} />
        <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} />
        <p className="text-[11px] text-muted">At least 8 characters, with a letter and a number.</p>

        {error && (
          <p className="text-xs text-red-600">
            {error}{' '}
            {/expired|invalid/i.test(error) && (
              <Link to="/forgot-password" className="font-semibold underline">
                Request a new link
              </Link>
            )}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Reset password
        </button>
      </form>
    </AuthCard>
  )
}
