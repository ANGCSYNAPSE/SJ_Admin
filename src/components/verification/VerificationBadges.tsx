import { BadgeCheck, CircleDashed, Mail, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react'
import { formatDate } from '../../lib/format'

function Badge({ icon: Icon, label, ok, at }: { icon: LucideIcon; label: string; ok: boolean; at?: string | null }) {
  return (
    <span
      title={ok ? `${label} verified${at ? ` on ${formatDate(at)}` : ''}` : `${label} not verified`}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        ok ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
      }`}
    >
      <Icon size={12} />
      {label}
      {ok ? <BadgeCheck size={12} /> : <CircleDashed size={12} />}
    </span>
  )
}

/** The three separate marks on an account: email, phone, and the admin's own check. */
export function VerificationBadges({
  emailVerified,
  mobileVerified,
  isVerified,
  emailVerifiedAt,
  mobileVerifiedAt,
  verifiedAt,
}: {
  emailVerified: boolean
  mobileVerified: boolean
  isVerified: boolean
  emailVerifiedAt?: string | null
  mobileVerifiedAt?: string | null
  verifiedAt?: string | null
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge icon={Mail} label="Email" ok={emailVerified} at={emailVerifiedAt} />
      <Badge icon={Smartphone} label="Phone" ok={mobileVerified} at={mobileVerifiedAt} />
      <Badge icon={ShieldCheck} label="Admin" ok={isVerified} at={verifiedAt} />
    </div>
  )
}
