import { api } from './client'
import type { ApiEnvelope, RegistrationType } from '../types/api'

export interface VerificationRegistration {
  type: RegistrationType
  status: string
  name: string
  complete: boolean
  missing: number
}

export interface VerificationItem {
  id: string
  fullName: string
  email: string
  mobile: string
  location: string | null
  isVerified: boolean
  isBlocked: boolean
  emailVerified: boolean
  emailVerifiedAt?: string | null
  mobileVerified: boolean
  mobileVerifiedAt?: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  createdAt: string
  paid: number
  registrations: VerificationRegistration[]
}

export interface VerificationDetail extends VerificationItem {
  role: string
  fee: { total: number; minimum: number }
  payments: { id: string; amount: number; refunded: number; status: string; source: string; paidAt: string | null; createdAt: string }[]
}

export interface VerificationPage {
  counts: { total: number; verified: number; unverified: number }
  total: number
  page: number
  pageSize: number
  fee: { total: number; minimum: number }
  items: VerificationItem[]
}

export type VerificationFilter = 'all' | 'unverified' | 'ready' | 'verified'

export async function fetchVerification(params: { status: VerificationFilter; q?: string; page: number; pageSize: number }) {
  return (await api.get<ApiEnvelope<VerificationPage>>('/admin/verification', { params })).data.data
}

export async function fetchVerificationDetail(id: string) {
  return (await api.get<ApiEnvelope<VerificationDetail>>(`/admin/verification/${id}`)).data.data
}

export async function setVerified(id: string, verified: boolean) {
  const res = await api.patch<ApiEnvelope<{ changed: boolean }> & { message: string }>(`/admin/verification/${id}`, { verified })
  return res.data
}

export async function bulkVerify(userIds: string[], verified: boolean) {
  const res = await api.post<ApiEnvelope<{ changed: number }> & { message: string }>('/admin/verification/bulk', { userIds, verified })
  return res.data
}
