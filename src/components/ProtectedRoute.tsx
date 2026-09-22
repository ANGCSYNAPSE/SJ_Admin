import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-page">
        <p className="text-sm text-muted">Loading admin panel…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-page px-6 text-center">
        <p className="font-display text-2xl font-semibold text-maroon">Access restricted</p>
        <p className="max-w-sm text-sm text-body">
          This account doesn't have admin access. Sign in with an administrator account to continue.
        </p>
      </div>
    )
  }

  return <Outlet />
}
