import { api } from './client'
import type { ApiEnvelope, AdminUser, AuthResult } from '../types/api'

export async function login(email: string, password: string, remember = true) {
  const res = await api.post<ApiEnvelope<AuthResult>>('/auth/login', { email, password, remember })
  // An email that belongs to an unfinished website signup (not an account) comes back without a session.
  if (!res.data.data?.accessToken) throw new Error('Invalid email or password.')
  return res.data.data
}

export interface AccountChange {
  fullName?: string
  mobile?: string
  email?: string
  /** Required when the email or mobile number changes. */
  currentPassword?: string
}

/** Changes the signed-in admin's name, mobile number or sign-in email (email and mobile need the current password). */
export async function updateAccount(input: AccountChange) {
  const res = await api.patch<ApiEnvelope<AdminUser>>('/me/account', input)
  return res.data.data
}

/** Changes the password. The other devices are signed out; this one stays signed in. */
export async function changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  await api.post('/me/password', input)
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function fetchMe() {
  const res = await api.get<ApiEnvelope<{ user: AdminUser }>>('/auth/me')
  return res.data.data.user
}

export async function forgotPassword(email: string) {
  await api.post('/auth/forgot-password', { email })
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  await api.post('/auth/reset-password', { token, password, confirmPassword })
}
