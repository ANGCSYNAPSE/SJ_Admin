import { useState, type FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import brandLogo from '../../assets/logo.svg'
import { apiErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export function Login() {
  const { user, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'Invalid email or password.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-white p-8 shadow-[0_4px_6px_rgba(107,31,31,0.04)]">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={brandLogo} alt="Shyam Jagat" className="h-50 w-auto object-contain" />
          <p className="font-display text-xl font-bold text-maroon">Admin Panel</p>
          <p className="text-xs text-muted">Sign in to manage the devotional ecosystem</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-heading">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none"
              placeholder="admin@shyamjagat.org"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium text-heading">
                Password
              </label>
              <span
                title="Not wired up yet — needs a password-reset API on the backend"
                className="cursor-not-allowed text-xs font-medium text-orange/60"
              >
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 pr-10 text-sm text-heading focus:border-orange focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-heading"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-orange py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
