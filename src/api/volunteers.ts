import { api } from './client'
import type { ApiEnvelope } from '../types/api'

export type VolunteerStatus = 'pending' | 'approved' | 'rejected' | 'blocked'

export interface VolunteerItem {
  id: string
  userId: string
  fullName: string
  email: string
  mobile: string
  isBlocked: boolean
  /** Has paid the registration fee (fully or in part): a volunteer who is also a member. */
  isMember: boolean
  status: VolunteerStatus
  interests: string[]
  skills: string[]
  availability: string | null
  city: string
  state: string
  about: string | null
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
}

export interface VolunteerList {
  items: VolunteerItem[]
  counts: Partial<Record<VolunteerStatus, number>>
}

export interface VolunteerFilters {
  status?: VolunteerStatus | ''
  interest?: string
  state?: string
  q?: string
}

/** The seva a volunteer can choose, as the volunteer form words it (the backend checks the same list). */
export const VOLUNTEER_INTERESTS = [
  'Food seva (Annadan)',
  'Night shelter (Rain Basera)',
  'Drinking water (Pani Ki Pyau)',
  'Ambulance help',
  'Gaushala seva',
  'Education support',
  'Health camps and care',
  'Dharamshala help',
  "Elders' care (Vriddhashram)",
  'Footwear seva (Juta Seva)',
  'Clean toilets (Swachh Shauchalay)',
  'Cleanliness drives (Swachh Vahini)',
]

export async function fetchVolunteers(filters: VolunteerFilters = {}) {
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  const res = await api.get<ApiEnvelope<VolunteerList>>('/admin/volunteers', { params })
  return res.data.data
}

export async function reviewVolunteer(id: string, status: VolunteerStatus, adminNote?: string) {
  const res = await api.patch<ApiEnvelope<VolunteerItem>>(`/admin/volunteers/${id}`, { status, ...(adminNote !== undefined ? { adminNote } : {}) })
  return res.data.data
}
