import type { AdItem, AdSlot } from '../types/api'

export type AdStatus = 'active' | 'scheduled' | 'expired' | 'paused' | 'draft'

export const adStatusLabel: Record<AdStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  paused: 'Paused',
}

export const slotLabel: Record<AdSlot, string> = {
  leaderboard: 'Leaderboard',
  banner: 'Banner',
  rectangle: 'Rectangle',
}

/** Paused wins over dates: an admin who paused a campaign expects it off regardless of schedule. */
export function adStatus(ad: AdItem, now = Date.now()): AdStatus {
  if (ad.isDraft) return 'draft'
  if (!ad.isActive) return 'paused'
  if (ad.endsAt && now > new Date(ad.endsAt).getTime()) return 'expired'
  if (ad.startsAt && now < new Date(ad.startsAt).getTime()) return 'scheduled'
  return 'active'
}

export function adTitle(ad: AdItem): string {
  return ad.title?.trim() || `${slotLabel[ad.placement]} ad`
}

export function formatRevenueLakhs(rupees: number): string {
  if (rupees >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} Lakhs`
  return `₹${rupees.toLocaleString('en-IN')}`
}
