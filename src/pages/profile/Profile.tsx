import { useState, type ReactNode } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, Mail, MapPin, Pencil, Phone, ShieldCheck, X, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { changePassword, updateAccount, type AccountChange } from '../../api/auth'
import { apiErrorMessage, apiFieldErrors } from '../../api/client'
import { formatDate } from '../../lib/format'
import { initials, roleTitle } from '../../components/layout/AccountMenu'
import { useToast } from '../../components/ui/Toast'

const inputClass =
  'w-full rounded-lg border border-card-border bg-search-bg px-3 py-2.5 text-sm text-heading focus:border-orange focus:outline-none'

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

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-heading">
      {label}
      {children}
      {hint && !error && <span className="text-[11px] font-normal text-muted">{hint}</span>}
      {error && <span className="text-[11px] font-normal text-red-600">{error}</span>}
    </label>
  )
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
      >
        {shown ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

/** The signed-in admin's own account: details, with an authorised way to change the sign-in email and the password. */
export function Profile() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

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

      {editing ? (
        <EditDetails
          onClose={() => setEditing(false)}
          onSaved={async (emailChanged) => {
            await refreshUser()
            setEditing(false)
            toast.success(emailChanged ? 'Profile updated. Use the new email the next time you sign in.' : 'Profile updated.')
          }}
        />
      ) : (
        <div className="rounded-xl border border-card-border-alt bg-white">
          <div className="flex items-center justify-between px-6 pt-5">
            <p className="text-sm font-semibold text-heading">Your details</p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-lg border border-header-border px-3.5 py-2 text-[13px] font-semibold text-heading transition-colors hover:bg-search-bg"
            >
              <Pencil size={14} /> Edit profile
            </button>
          </div>
          <div className="divide-y divide-card-border-alt">
            <Row icon={Mail} label="Email (used to sign in)" value={user.email} />
            <Row icon={Phone} label="Mobile" value={`+91 ${user.mobile}`} />
            {user.location && <Row icon={MapPin} label="Location" value={user.location} />}
            <Row icon={ShieldCheck} label="Admin since" value={formatDate(user.createdAt)} />
          </div>
        </div>
      )}

      {changingPassword ? (
        <ChangePassword
          onClose={() => setChangingPassword(false)}
          onSaved={() => {
            setChangingPassword(false)
            toast.success('Password changed. Your other devices have been signed out.')
          }}
        />
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-card-border-alt bg-white p-6">
          <div>
            <p className="text-sm font-semibold text-heading">Password</p>
            <p className="text-[13px] text-body">Choose a new password. You will need the current one.</p>
          </div>
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-orange px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            <KeyRound size={14} /> Change password
          </button>
        </div>
      )}
    </div>
  )
}

function EditDetails({ onClose, onSaved }: { onClose: () => void; onSaved: (emailChanged: boolean) => Promise<void> }) {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [mobile, setMobile] = useState(user?.mobile ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  if (!user) return null
  const emailChanged = email.trim().toLowerCase() !== user.email
  const mobileChanged = mobile.trim() !== user.mobile
  const needsPassword = emailChanged || mobileChanged
  const changed = emailChanged || mobileChanged || fullName.trim() !== user.fullName
  const valid = fullName.trim().length >= 2 && /^[6-9]\d{9}$/.test(mobile.trim()) && /\S+@\S+\.\S+/.test(email.trim()) && (!needsPassword || currentPassword.length > 0)

  async function save() {
    setBusy(true)
    setError(null)
    setFields({})
    const change: AccountChange = {}
    if (fullName.trim() !== user!.fullName) change.fullName = fullName.trim()
    if (mobileChanged) change.mobile = mobile.trim()
    if (emailChanged) change.email = email.trim().toLowerCase()
    if (needsPassword) change.currentPassword = currentPassword
    try {
      await updateAccount(change)
      await onSaved(emailChanged)
    } catch (e) {
      setFields(apiFieldErrors(e))
      setError(apiErrorMessage(e, 'Could not save your changes.'))
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-heading">Edit profile</p>
        <button type="button" onClick={onClose} aria-label="Cancel" className="text-muted hover:text-heading">
          <X size={18} />
        </button>
      </div>
      <Field label="Full name" error={fields.fullName}>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Mobile number" error={fields.mobile} hint="10 digits, without +91">
        <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Email (used to sign in)" error={fields.email}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={inputClass} />
      </Field>

      {needsPassword && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-[13px] text-amber-900">
            Changing your {emailChanged && mobileChanged ? 'email and mobile number' : emailChanged ? 'sign-in email' : 'mobile number'} needs your current password. A notice will also be sent
            to your old email.
          </p>
          <Field label="Current password" error={fields.currentPassword}>
            <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          </Field>
        </div>
      )}

      {error && Object.keys(fields).length === 0 && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-header-border px-5 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!valid || !changed || busy}
          className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Save changes
        </button>
      </div>
    </section>
  )
}

function ChangePassword({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  const strong = newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /\d/.test(newPassword)
  const matches = newPassword === confirmPassword
  const valid = currentPassword.length > 0 && strong && matches

  async function save() {
    setBusy(true)
    setError(null)
    setFields({})
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword })
      onSaved()
    } catch (e) {
      setFields(apiFieldErrors(e))
      setError(apiErrorMessage(e, 'Could not change the password.'))
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-card-border-alt bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-heading">Change password</p>
        <button type="button" onClick={onClose} aria-label="Cancel" className="text-muted hover:text-heading">
          <X size={18} />
        </button>
      </div>
      <Field label="Current password" error={fields.currentPassword}>
        <PasswordInput value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
      </Field>
      <Field label="New password" error={fields.newPassword} hint="At least 8 characters, with a letter and a number">
        <PasswordInput value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" error={fields.confirmPassword ?? (confirmPassword && !matches ? 'The passwords do not match.' : undefined)}>
        <PasswordInput value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
      </Field>
      {error && Object.keys(fields).length === 0 && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-header-border px-5 py-2.5 text-[13px] font-semibold text-heading hover:bg-search-bg">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!valid || busy}
          className="flex items-center gap-2 rounded-lg bg-orange px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          Change password
        </button>
      </div>
    </section>
  )
}
