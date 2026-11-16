import { api } from './client'
import type { AdminUser, ApiEnvelope, UserRole } from '../types/api'

export type NewUserStatus = 'active' | 'suspended' | 'pending'

export interface CreateUserInput {
  fullName: string
  email: string
  mobile: string
  password: string
  role: UserRole
  location?: string
  avatarUrl?: string
  status: NewUserStatus
}

export async function fetchUsers() {
  const res = await api.get<ApiEnvelope<AdminUser[]>>('/admin/users')
  return res.data.data
}

export async function createUser(input: CreateUserInput) {
  const res = await api.post<ApiEnvelope<AdminUser>>('/admin/users', input)
  return res.data.data
}

export async function setUserBlocked(id: string, blocked: boolean) {
  const res = await api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}/${blocked ? 'block' : 'unblock'}`)
  return res.data.data
}

export async function changeUserRole(id: string, role: UserRole) {
  const res = await api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}/role`, { role })
  return res.data.data
}

export async function fetchUser(id: string) {
  const res = await api.get<ApiEnvelope<AdminUser>>(`/admin/users/${id}`)
  return res.data.data
}

export interface UpdateUserInput {
  fullName?: string
  email?: string
  mobile?: string
  location?: string | null
  avatarUrl?: string | null
  role?: UserRole
  status?: NewUserStatus
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const res = await api.patch<ApiEnvelope<AdminUser>>(`/admin/users/${id}`, input)
  return res.data.data
}

export async function sendResetPasswordLink(id: string) {
  const res = await api.post<ApiEnvelope<null>>(`/admin/users/${id}/reset-password-link`)
  return res.data.message
}

export async function deleteUser(id: string) {
  await api.delete(`/admin/users/${id}`)
}
