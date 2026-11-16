import { api } from './client'
import type { ApiEnvelope, AdminUser, AuthResult } from '../types/api'

export async function login(email: string, password: string, remember = true) {
  const res = await api.post<ApiEnvelope<AuthResult>>('/auth/login', { email, password, remember })
  return res.data.data
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
