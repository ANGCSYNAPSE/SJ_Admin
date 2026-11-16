import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react'
import { forgotPassword } from '../../api/auth'
import { apiErrorMessage } from '../../api/client'
import { AuthCard } from '../../components/auth/AuthCard'

const inputClass =
  'rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await forgotPassword(email)
      setSentTo(email)
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (sentTo) {
    return (
      <AuthCard
        title="Check your email"
        subtitle={`If an account exists for ${sentTo}, we have sent a link to reset your password. It expires in 30 minutes.`}
        icon={<MailCheck size={26} />}
      >
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="rounded-lg border border-header-border bg-white py-2.5 text-sm font-semibold text-heading hover:bg-search-bg"
          >
            Use a different email
          </button>
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-maroon hover:underline">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Forgot password?"
      subtitle="Enter your admin email and we will send you a link to reset your password."
      icon={<KeyRound size={26} />}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium text-heading">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="admin@shyamjagat.org"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Send reset link
        </button>
        <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-maroon hover:underline">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </form>
    </AuthCard>
  )
}
