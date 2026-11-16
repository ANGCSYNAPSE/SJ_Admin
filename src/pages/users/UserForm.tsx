import { useEffect, useState, type DragEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Eye, EyeOff, Loader2, Lock, UploadCloud, X } from 'lucide-react'
import { createUser, fetchUser, sendResetPasswordLink, updateUser, type NewUserStatus } from '../../api/users'
import { uploadFile } from '../../api/uploads'
import { apiErrorMessage, resolveUploadUrl } from '../../api/client'
import { roleLabel, userStatus } from '../../lib/users'
import type { AdminUser, UserRole } from '../../types/api'
import { Loader } from '../../components/ui/Loader'

const labelClass = 'text-[13px] font-semibold text-heading'
const inputClass =
  'w-full rounded-lg border border-card-border bg-white px-3.5 py-2.5 text-sm text-heading placeholder:text-muted focus:border-orange focus:outline-none'

const statusOptions: { value: NewUserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending Verification' },
]

function SelectField({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} appearance-none pr-9`}>
        {children}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
    </div>
  )
}

function toFormStatus(user: AdminUser): NewUserStatus {
  const status = userStatus(user)
  return status === 'unverified' ? 'pending' : status
}

export function UserForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(isEdit)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<UserRole>('member')
  const [location, setLocation] = useState('')
  const [status, setStatus] = useState<NewUserStatus>('active')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    let cancelled = false

    fetchUser(id)
      .then((found) => {
        if (cancelled) return
        setUser(found)
        setFullName(found.fullName)
        setEmail(found.email)
        setMobile(found.mobile)
        setRole(found.role)
        setLocation(found.location ?? '')
        setStatus(toFormStatus(found))
        setAvatarUrl(found.avatarUrl ?? null)
      })
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load this user.')))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, isEdit])

  async function handleFile(file: File) {
    setIsUploading(true)
    setError(null)
    try {
      const uploaded = await uploadFile(file)
      setAvatarUrl(uploaded.url)
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload photo.'))
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleSendReset() {
    if (!user) return
    setError(null)
    setNotice(null)
    setIsSendingReset(true)
    try {
      setNotice(await sendResetPasswordLink(user.id))
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not send the reset link.'))
    } finally {
      setIsSendingReset(false)
    }
  }

  async function submit() {
    setError(null)
    setNotice(null)
    const phone = mobile.replace(/\D/g, '').slice(-10)

    if (!fullName.trim()) return setError('Full name is required.')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.')
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit Indian mobile number.')
    if (!isEdit && (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password))) {
      return setError('Password must be at least 8 characters and include a letter and a number.')
    }

    setIsSubmitting(true)
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: phone,
          location: location.trim() || null,
          avatarUrl,
          role,
          status,
        })
      } else {
        await createUser({
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: phone,
          password,
          role,
          location: location.trim() || undefined,
          avatarUrl: avatarUrl ?? undefined,
          status,
        })
      }
      navigate('/users')
    } catch (err) {
      setError(apiErrorMessage(err, `Failed to ${isEdit ? 'update' : 'create'} this user.`))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <Loader label="Loading user…" />

  const roleField = (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass} htmlFor="user-role">
        Role
      </label>
      <SelectField id="user-role" value={role} onChange={(v) => setRole(v as UserRole)}>
        {(Object.keys(roleLabel) as UserRole[]).map((key) => (
          <option key={key} value={key}>
            {roleLabel[key]}
          </option>
        ))}
      </SelectField>
    </div>
  )

  const statusField = (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass} htmlFor="user-status">
        Status
      </label>
      <SelectField id="user-status" value={status} onChange={(v) => setStatus(v as NewUserStatus)}>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </div>
  )

  const photoInput = (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
        e.target.value = ''
      }}
    />
  )

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-header-border bg-white p-8">
      <div className="flex items-start gap-6">
        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="user-name">
              Full Name
            </label>
            <input id="user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="e.g. Rajesh Kumar" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="user-email">
              Email
            </label>
            <input
              id="user-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="e.g. rajesh@gmail.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="user-phone">
              Phone
            </label>
            <input id="user-phone" value={mobile} onChange={(e) => setMobile(e.target.value)} className={inputClass} placeholder="e.g. +91 98765 43210" />
          </div>

          {isEdit ? (
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Security</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-card-border bg-search-bg p-3">
                <Lock size={16} className="shrink-0 text-muted" />
                <p className="text-[13px] text-heading">Password is encrypted. Need a change?</p>
                <button
                  type="button"
                  onClick={handleSendReset}
                  disabled={isSendingReset}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-orange underline hover:opacity-80 disabled:opacity-60"
                >
                  {isSendingReset && <Loader2 size={12} className="animate-spin" />}
                  Send Reset Password Link
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} htmlFor="user-password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="user-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-10`}
                    placeholder="Enter secure password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3.5 text-muted hover:text-heading"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {roleField}
            </>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="user-location">
              Location
            </label>
            <input id="user-location" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="e.g. Jaipur, Rajasthan" />
          </div>

          {isEdit ? (
            <>
              {roleField}
              {statusField}
            </>
          ) : (
            statusField
          )}

          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Profile Photo</span>
            {isEdit ? (
              <div className="flex items-center gap-4 rounded-xl border border-card-border p-4">
                {avatarUrl ? (
                  <img src={resolveUploadUrl(avatarUrl) ?? undefined} alt="" className="size-16 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-maroon font-display text-2xl font-bold text-white">
                    {fullName.trim().charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="cursor-pointer text-[13px] font-semibold text-orange hover:underline">
                    {isUploading ? 'Uploading…' : 'Change Image'}
                    {photoInput}
                  </label>
                  <p className="text-[11px] text-muted">Min 400x400px • PNG, JPG</p>
                </div>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="ml-auto flex size-6 items-center justify-center rounded-full text-muted hover:bg-search-bg hover:text-heading"
                    aria-label="Remove photo"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${
                  isDragging ? 'border-orange bg-orange/5' : 'border-card-border bg-search-bg'
                }`}
              >
                {avatarUrl ? (
                  <>
                    <img src={resolveUploadUrl(avatarUrl) ?? undefined} alt="" className="size-28 rounded-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white text-heading shadow"
                      aria-label="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {isUploading ? <Loader2 size={22} className="animate-spin text-orange" /> : <UploadCloud size={22} className="text-orange" />}
                    <p className="text-[13px] font-semibold text-heading">
                      {isUploading ? (
                        'Uploading…'
                      ) : (
                        <>
                          Drag &amp; drop or{' '}
                          <label className="cursor-pointer text-orange underline-offset-2 hover:underline">
                            browse
                            {photoInput}
                          </label>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-muted">PNG, JPG or WEBP up to 5MB (Square ratio recommended)</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {notice && <p className="text-xs text-success">{notice}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="h-px w-full bg-header-border" />

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={isSubmitting || isUploading}
          onClick={submit}
          className="flex items-center gap-2 rounded-lg bg-orange px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          {isEdit ? 'Update User' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="rounded-lg border border-header-border bg-search-bg px-6 py-3 text-sm font-semibold text-heading transition-colors hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
