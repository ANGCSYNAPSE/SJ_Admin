import { api } from './client'
import type { ApiEnvelope, EventItem } from '../types/api'

export interface EventInput {
  title: string
  description: string
  location: string
  venueAddress?: string
  startDate: string
  endDate?: string
  type: string
  registrationLimit?: number
  organizerName?: string
  contactNumber?: string
  image?: string
  slug?: string
  metaTitle?: string
  metaDescription?: string
  focusKeywords: string[]
  isIndexed: boolean
  isPublished: boolean
}

export async function fetchEvents() {
  const res = await api.get<ApiEnvelope<EventItem[]>>('/events')
  return res.data.data
}

export async function fetchEvent(id: string) {
  const res = await api.get<ApiEnvelope<EventItem>>(`/events/${id}`)
  return res.data.data
}

export async function createEvent(input: EventInput) {
  const res = await api.post<ApiEnvelope<EventItem>>('/events', input)
  return res.data.data
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const res = await api.patch<ApiEnvelope<EventItem>>(`/events/${id}`, input)
  return res.data.data
}

export async function deleteEvent(id: string) {
  await api.delete(`/events/${id}`)
}

/** Registration ("RSVP") count for one event — no bulk-count endpoint exists, so this hits the per-event volunteers list. */
export async function fetchEventRegistrationCount(eventId: string) {
  const res = await api.get<ApiEnvelope<unknown[]>>(`/events/${eventId}/volunteers`)
  return res.data.data.length
}
