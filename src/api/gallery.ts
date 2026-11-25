import { api } from './client'
import type { ApiEnvelope } from '../types/api'

export type GalleryStatus = 'pending' | 'approved' | 'rejected'

export interface GalleryItem {
  id: string
  gallery: 'initiatives' | 'own-wish'
  folder: string
  kind: 'photo' | 'video'
  url: string
  caption: string | null
  status: GalleryStatus
  adminNote: string | null
  createdAt: string
  reviewedAt: string | null
  fullName: string
  email: string
}

export interface GalleryList {
  items: GalleryItem[]
  counts: Partial<Record<GalleryStatus, number>>
}

/** Photographs and videos members shared for the website's galleries, by status. Only approved ones are ever shown to the public. */
export async function fetchGalleryItems(status: GalleryStatus) {
  const res = await api.get<ApiEnvelope<GalleryList>>('/admin/gallery', { params: { status } })
  return res.data.data
}

export async function reviewGalleryItem(id: string, status: GalleryStatus, note?: string) {
  await api.patch(`/admin/gallery/${id}`, { status, note })
}
