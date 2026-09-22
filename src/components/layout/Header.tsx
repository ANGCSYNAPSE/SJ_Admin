import { Bell, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export interface BreadcrumbItem {
  label: string
  to?: string
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function Header({ title, breadcrumb }: { title: string; breadcrumb?: BreadcrumbItem[] }) {
  const { user } = useAuth()
  const name = user?.fullName ?? 'Admin'
  const roleLabel = user?.role === 'admin' ? 'Chief Administrator' : (user?.role ?? '')

  return (
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-header-border bg-white px-8">
      <div className="min-w-0">
        <h1
          className={`truncate font-display font-bold text-maroon ${breadcrumb ? 'text-[24px] leading-tight' : 'text-[26px]'}`}
        >
          {title}
        </h1>
        {breadcrumb && (
          <p className="truncate text-xs text-muted">
            {breadcrumb.map((item, i) => (
              <span key={i}>
                {i > 0 && ' > '}
                {item.to ? (
                  <Link to={item.to} className="hover:text-heading hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </span>
            ))}
          </p>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex w-[220px] items-center gap-2 rounded-lg border border-card-border bg-search-bg px-3 py-2">
          <Search size={14} className="shrink-0 text-muted" />
          <input
            type="text"
            placeholder="Search admin database..."
            className="w-full bg-transparent text-xs text-heading placeholder:text-muted focus:outline-none"
          />
        </div>

        <button type="button" className="relative text-heading" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-orange ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-maroon">
            <span className="font-display text-base font-bold text-white">{initials(name)}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-heading">{name}</p>
            <p className="truncate text-[10px] font-medium text-muted capitalize">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
