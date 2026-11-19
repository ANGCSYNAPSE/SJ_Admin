import { api } from './client'
import type { ApiEnvelope, NotificationKind, RegistrationType, SentNotification } from '../types/api'

export type NotificationCategory = 'announcement' | 'event' | 'update' | 'seva' | 'payment' | 'registration' | 'system'

export interface SendNotificationInput {
  userIds: string[]
  message: string
  title?: string
  kind: NotificationKind
  category?: NotificationCategory
  /** A path inside the site, e.g. /complete-profile. */
  link?: string
}

/** Sends a message that each recipient sees in their notification bell (and as a pop-up when it is recent). */
export async function sendNotification(input: SendNotificationInput) {
  const res = await api.post<ApiEnvelope<{ sent: number }>>('/admin/notifications', input)
  return res.data
}

export async function fetchSentNotifications(userId: string) {
  const res = await api.get<ApiEnvelope<SentNotification[]>>('/admin/notifications', { params: { userId } })
  return res.data.data
}

/** Who a message goes to. */
export type Audience =
  | { mode: 'all' }
  | {
      mode: 'segment'
      segment: {
        fee?: 'paid' | 'partial' | 'unpaid'
        categories?: RegistrationType[]
        profile?: 'incomplete' | 'complete'
        registration?: 'none' | 'any'
        verified?: 'yes' | 'no'
      }
    }
  | { mode: 'users'; userIds: string[] }

export interface AudiencePreview {
  count: number
  capped: boolean
  sample: string[]
}

export interface BroadcastInput {
  audience: Audience
  message: string
  title?: string
  kind: NotificationKind
  category: NotificationCategory
  link?: string
}

export interface Broadcast {
  id: string
  title: string | null
  message: string
  kind: NotificationKind
  category: NotificationCategory
  link: string | null
  audience: Audience
  recipients: number
  read: number
  createdAt: string
  createdBy: string | null
}

export async function previewAudience(audience: Audience) {
  const res = await api.post<ApiEnvelope<AudiencePreview>>('/admin/notifications/audience', { audience })
  return res.data.data
}

export async function sendBroadcast(input: BroadcastInput) {
  const res = await api.post<ApiEnvelope<{ broadcastId: string; sent: number }>>('/admin/notifications/broadcast', input)
  return res.data
}

export async function fetchBroadcasts() {
  const res = await api.get<ApiEnvelope<Broadcast[]>>('/admin/notifications/broadcasts')
  return res.data.data
}
