import type { ReactNode } from 'react'
import brandLogo from '../../assets/logo.svg'

interface AuthCardProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
}

export function AuthCard({ title, subtitle, icon, children }: AuthCardProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded-2xl border border-card-border bg-white p-8 shadow-[0_4px_6px_rgba(107,31,31,0.04)]">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src={brandLogo} alt="Shyam Jagat" className="h-32 w-auto object-contain" />
          {icon && <div className="flex size-14 items-center justify-center rounded-full bg-icon-tint text-orange">{icon}</div>}
          <p className="font-display text-xl font-bold text-maroon">{title}</p>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
