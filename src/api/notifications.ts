import { api } from './client'
import type { ApiEnvelope, NotificationKind, SentNotification } from '../types/api'

export interface SendNotificationInput {
  userIds: string[]
  message: string
  title?: string
  kind: NotificationKind
  /** A path inside the site, e.g. /complete-profile. */
  link?: string
}

/** Sends a message that each recipient sees as a toast the next time they are signed in on the site. */
export async function sendNotification(input: SendNotificationInput) {
  const res = await api.post<ApiEnvelope<{ sent: number }>>('/admin/notifications', input)
  return res.data
}

export async function fetchSentNotifications(userId: string) {
  const res = await api.get<ApiEnvelope<SentNotification[]>>('/admin/notifications', { params: { userId } })
  return res.data.data
}
