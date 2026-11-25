import { api } from './client'
import type { ApiEnvelope } from '../types/api'

/** How many things are waiting for an admin, section by section (GET /admin/dashboard/pending). */
export interface PendingCounts {
  registrations: number
  temples: number
  artists: number
  dharamshalas: number
  organisations: number
  volunteers: number
  verification: number
  contactInquiries: number
  gallery: number
}

export async function fetchPendingCounts() {
  const res = await api.get<ApiEnvelope<PendingCounts>>('/admin/dashboard/pending')
  return res.data.data
}
