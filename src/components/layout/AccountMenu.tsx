import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { SendResetLinkDialog } from './SendResetLinkDialog'

export function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function roleTitle(role: string | undefined) {
  return role === 'admin' ? 'Chief Administrator' : (role ?? '')
}

const itemClass =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-heading transition-colors hover:bg-search-bg'

/** The admin's name and avatar in the header; opens a menu with their profile, a password reset and log out. */
export function AccountMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const name = user?.fullName ?? 'Admin'

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-search-bg"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-maroon">
          <span className="font-display text-base font-bold text-white">{initials(name)}</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-heading">{name}</p>
          <p className="truncate text-[10px] font-medium capitalize text-muted">{roleTitle(user?.role)}</p>
        </div>
        <ChevronDown size={14} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-30 w-64 overflow-hidden rounded-xl border border-card-border-alt bg-white shadow-lg"
        >
          <div className="border-b border-card-border-alt px-4 py-3">
            <p className="truncate text-sm font-semibold text-heading">{name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                navigate('/profile')
              }}
            >
              <User size={15} className="text-orange" /> View profile
            </button>
            <button
              type="button"
              role="menuitem"
              className={itemClass}
              onClick={() => {
                setOpen(false)
                setResetting(true)
              }}
            >
              <KeyRound size={15} className="text-orange" /> Reset password
            </button>
          </div>
          <div className="border-t border-card-border-alt py-1">
            <button
              type="button"
              role="menuitem"
              className={`${itemClass} text-[#ef4444]`}
              onClick={() => {
                setOpen(false)
                void logout()
              }}
            >
              <LogOut size={15} /> Log out
            </button>
          </div>
        </div>
      )}

      {resetting && user && <SendResetLinkDialog email={user.email} onClose={() => setResetting(false)} />}
    </div>
  )
}
