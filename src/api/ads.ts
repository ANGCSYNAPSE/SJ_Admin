import { api } from './client'
import type { AdItem, AdRotation, AdSlot, AdTemplate, AdTheme, ApiEnvelope } from '../types/api'

export interface AdInput {
  title?: string
  advertiser?: string
  adType?: string
  placement: AdSlot
  page?: string
  imageUrl?: string
  linkUrl?: string
  ctaLabel?: string
  template?: AdTemplate
  headline?: string
  subline?: string
  theme?: AdTheme
  bgFrom?: string
  bgTo?: string
  ctaColor?: string
  slotPosition?: number | null
  isActive: boolean
  startsAt?: string
  endsAt?: string
  revenueRupees?: number
  priority?: AdItem['priority']
  description?: string
  isDraft?: boolean
}

export async function fetchAds() {
  const res = await api.get<ApiEnvelope<AdItem[]>>('/admin/ads')
  return res.data.data
}

export async function fetchAd(id: string) {
  const res = await api.get<ApiEnvelope<AdItem>>(`/admin/ads/${id}`)
  return res.data.data
}

export async function createAd(input: AdInput) {
  const res = await api.post<ApiEnvelope<AdItem>>('/admin/ads', input)
  return res.data.data
}

export async function updateAd(id: string, input: Partial<AdInput>) {
  const res = await api.patch<ApiEnvelope<AdItem>>(`/admin/ads/${id}`, input)
  return res.data.data
}

export async function deleteAd(id: string) {
  await api.delete(`/admin/ads/${id}`)
}

export async function fetchAdRotation() {
  const res = await api.get<ApiEnvelope<AdRotation>>('/admin/ads/rotation')
  return res.data.data
}

export async function saveAdRotation(rules: AdRotation) {
  const res = await api.put<ApiEnvelope<AdRotation>>('/admin/ads/rotation', rules)
  return res.data.data
}
