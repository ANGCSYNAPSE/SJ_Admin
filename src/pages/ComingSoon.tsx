import { useLocation } from 'react-router-dom'
import { navItems } from '../components/layout/navConfig'

export function ComingSoon() {
  const location = useLocation()
  const item = navItems.find((nav) => nav.path === location.pathname)
  const Icon = item?.icon

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-card-border-alt bg-white/60 text-center">
      {Icon && <Icon size={32} className="text-orange" strokeWidth={1.5} />}
      <p className="font-display text-xl font-semibold text-maroon">{item?.label ?? 'This page'} is coming soon</p>
      <p className="max-w-sm text-sm text-body">
        This section is scoped and ready to be wired up next — send over the design and we'll build it out.
      </p>
    </div>
  )
}
