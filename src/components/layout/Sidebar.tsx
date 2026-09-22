import { LogOut } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import brandLogo from '../../assets/logo-footer.svg'
import { useAuth } from '../../context/AuthContext'
import { navItems } from './navConfig'

export function Sidebar() {
  const { logout } = useAuth()

  return (
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-sidebar-border bg-sidebar ">
      <div className="flex flex-col items-center gap-2.5 px-5 py-4">
        <div className="h-30 w-auto overflow-hidden">
          <img src={brandLogo} alt="Shyam Jagat" className="size-full object-cover" />
        </div>
      </div>

      <div className="border-t border-sidebar-border" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-none">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-orange-active font-semibold text-white'
                  : 'font-medium text-white/90 hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border flex flex-col items-center gap-2.5 pb-2">
        {/* <div className="flex items-center gap-3">
          <img src={avatarPlaceholder} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? 'Admin User'}</p>
            <p className="truncate text-[11px] text-sidebar-text capitalize">
              {user?.role === 'admin' ? 'Super Admin' : (user?.role ?? '')}
            </p>
          </div>
        </div> */}
        <button
          type="button"
          onClick={logout}
          className="mt-5 flex items-center gap-1.5 text-base font-medium text-sidebar-text-dim transition-colors hover:text-white"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </aside>
  )
}
