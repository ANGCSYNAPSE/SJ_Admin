import { Navigate, Outlet } from'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader } from './ui/Loader'

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <Loader fullScreen label="Loading admin panel…" />
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
