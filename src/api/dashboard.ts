import { api } from './client'
import type { ApiEnvelope, DashboardPayload } from '../types/api'

export async function fetchDashboard() {
  const res = await api.get<ApiEnvelope<DashboardPayload>>('/admin/dashboard/stats')
  return res.data.data
}
