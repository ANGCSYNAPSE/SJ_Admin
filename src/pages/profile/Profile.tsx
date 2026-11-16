import { useState } from 'react'
import { KeyRound, Mail, MapPin, Phone, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../lib/format'
import { initials, roleTitle } from '../../components/layout/AccountMenu'
import { SendResetLinkDialog } from '../../components/layout/SendResetLinkDialog'

function Row({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-icon-tint">
        <Icon size={16} className="text-orange" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-medium text-heading">{value}</p>
      </div>
    </div>
  )
}

/** The signed-in admin's own account, read-only, with a way to reset the password. */
export function Profile() {
  const { user } = useAuth()
  const [resetting, setResetting] = useState(false)

  if (!user) return null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-5 rounded-xl border border-card-border-alt bg-white p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-maroon">
          <span className="font-display text-2xl font-bold text-white">{initials(user.fullName)}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-bold text-maroon">{user.fullName}</p>
          <p className="text-sm text-body">{roleTitle(user.role)}</p>
        </div>
      </div>

      <div className="divide-y divide-card-border-alt rounded-xl border border-card-border-alt bg-white">
        <Row icon={Mail} label="Email" value={user.email} />
        <Row icon={Phone} label="Mobile" value={`+91 ${user.mobile}`} />
        {user.location && <Row icon={MapPin} label="Location" value={user.location} />}
        <Row icon={ShieldCheck} label="Admin since" value={formatDate(user.createdAt)} />
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-card-border-alt bg-white p-6">
        <div>
          <p className="text-sm font-semibold text-heading">Password</p>
          <p className="text-[13px] text-body">We&apos;ll email you a link to choose a new one.</p>
        </div>
        <button
          type="button"
          onClick={() => setResetting(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <KeyRound size={14} /> Reset password
        </button>
      </div>

      {resetting && <SendResetLinkDialog email={user.email} onClose={() => setResetting(false)} />}
    </div>
  )
}
