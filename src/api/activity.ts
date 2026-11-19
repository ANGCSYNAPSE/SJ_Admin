import { api } from './client'
import type { ApiEnvelope } from '../types/api'

export type ActivityKind = 'signup' | 'registration' | 'payment' | 'donation' | 'message'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  detail: string
  /** A path inside the admin app. */
  link: string
  at: string
}

export interface Activity {
  attention: { registrations: number; unverified: number; messages: number }
  items: ActivityItem[]
}

export async function fetchActivity() {
  return (await api.get<ApiEnvelope<Activity>>('/admin/activity')).data.data
}
