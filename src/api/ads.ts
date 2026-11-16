import { api } from './client'
import type { AdItem, AdSlot, ApiEnvelope } from '../types/api'

export interface AdInput {
  title?: string
  advertiser?: string
  adType?: string
  placement: AdSlot
  page?: string
  imageUrl: string
  linkUrl?: string
  ctaLabel?: string
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
