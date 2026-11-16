import type { RegistrationStatus, RegistrationType } from '../types/api'

export const typeLabel: Record<RegistrationType, string> = {
  artist: 'Artist',
  dancer: 'Dancer',
  musician: 'Musician',
  temple: 'Temple',
  dharamshala: 'Dharamshala',
  mandal: 'Mandal / Organisation',
}

export const statusLabel: Record<RegistrationStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  blocked: 'Blocked',
}

const keyLabels: Record<string, string> = {
  pinCode: 'PIN code',
  dateOfBirth: 'Date of birth',
  primarySpecialty: 'Primary specialty',
  secondarySpecialty: 'Secondary specialty',
  yearEstablished: 'Year of establishment',
  trustName: 'Trust / organisation',
  mapsLink: 'Google Maps link',
  aartiTimings: 'Aarti timings',
  licenseNumber: 'Licence number',
  distanceFromTemple: 'Distance from temple',
  officialPhone: 'Official phone',
  memberCountBand: 'Active members',
  profilePhoto: 'Profile photo',
  primaryPhoto: 'Primary photo',
  managerIdProof: 'Manager ID proof',
  consentContact: 'Contact consent',
  consentComms: 'Communications consent',
}

/** "pinCode" -> "PIN code", "templeName" -> "Temple name". */
export function fieldLabel(key: string): string {
  if (keyLabels[key]) return keyLabels[key]
  const spaced = key.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Detail-panel fields that are bookkeeping rather than something the person filled in. */
export const hiddenFields = new Set(['id', 'userId', 'adminNote', 'missingFields', 'createdAt', 'updatedAt', 'status', 'account'])

const imagePattern = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i

export function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value)
}

export function isImageUrl(value: unknown): value is string {
  return isHttpUrl(value) && (imagePattern.test(value) || value.includes('/image/upload/'))
}

/** A starting point for the reminder an admin sends to someone with an unfinished profile. */
export function reminderMessage(name: string, type: RegistrationType, missing: string[]): string {
  const list = missing.map(fieldLabel).join(', ')
  return `Hi ${name}, your ${typeLabel[type].toLowerCase()} registration is almost done. Please add the remaining details (${list}) so our team can review it.`
}
