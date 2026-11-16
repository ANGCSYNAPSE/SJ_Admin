import { ArrowLeft, Bell, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccountMenu } from './AccountMenu'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export function Header({ title, breadcrumb }: { title: string; breadcrumb?: BreadcrumbItem[] }) {
  // The parent list page: the last breadcrumb entry that links somewhere.
  const backTo = breadcrumb && breadcrumb.length > 2 ? [...breadcrumb].reverse().find((item) => item.to)?.to : undefined

  return (
    <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-header-border bg-white px-8">
      <div className="flex min-w-0 items-center gap-3">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Go back"
            title="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-header-border bg-search-bg text-heading transition-colors hover:bg-white hover:text-orange"
          >
            <ArrowLeft size={18} />
          </Link>
        )}
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

        <AccountMenu />
      </div>
    </header>
  )
}
