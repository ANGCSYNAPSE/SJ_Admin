import { api } from './client'
import type { ApiEnvelope, RegistrationDetail, RegistrationRow, RegistrationType } from '../types/api'

export type RegistrationAction = 'verify' | 'reject' | 'block' | 'unblock'

export async function fetchRegistrations() {
  const res = await api.get<ApiEnvelope<RegistrationRow[]>>('/admin/registrations')
  return res.data.data
}

export async function fetchRegistration(type: RegistrationType, id: string) {
  const res = await api.get<ApiEnvelope<RegistrationDetail>>(`/admin/registrations/${type}/${id}`)
  return res.data.data
}

export async function runRegistrationAction(type: RegistrationType, id: string, action: RegistrationAction, adminNote?: string) {
  const res = await api.patch<ApiEnvelope<RegistrationDetail>>(`/admin/registrations/${type}/${id}/${action}`, { adminNote })
  return res.data.data
}

export async function saveRegistrationNote(type: RegistrationType, id: string, adminNote: string) {
  const res = await api.patch<ApiEnvelope<RegistrationDetail>>(`/admin/registrations/${type}/${id}`, { adminNote })
  return res.data.data
}

export async function deleteRegistration(type: RegistrationType, id: string) {
  await api.delete(`/admin/registrations/${type}/${id}`)
}
