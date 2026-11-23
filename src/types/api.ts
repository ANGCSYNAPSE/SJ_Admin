export type UserRole = 'member' | 'artist' | 'temple_admin' | 'admin'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  mobile: string
  role: UserRole
  /** An admin has checked this account. */
  isVerified: boolean
  emailVerified?: boolean
  mobileVerified?: boolean
  isBlocked?: boolean
  location?: string | null
  avatarUrl?: string | null
  lastLoginAt?: string | null
  createdAt: string
}

export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  errors?: unknown
}

export interface AuthResult {
  user: AdminUser
  accessToken: string
}

export interface DashboardStats {
  temples: { total: number; newThisWeek: number }
  artists: { total: number; pendingApproval: number }
  dharamshalas: { total: number }
  donations: { totalRupees: number; thisMonthRupees: number; lastMonthRupees: number }
  communities: { total: number; members: number; dailyDiscussions: number }
  events: { activeOrUpcoming: number }
  blogPosts: { published: number }
  users: { total: number }
  registrations: { pending: number }
  organisations: { total: number; newThisMonth: number }
  ads: { active: number; newThisWeek: number }
  volunteers: { total: number; newThisQuarter: number }
}

export interface DonationTrendPoint {
  month: string
  totalRupees: number
}

export type ActivityKind =
  | 'temple_listed'
  | 'donation_received'
  | 'blog_submitted'
  | 'artist_approval_requested'

export interface ActivityItem {
  kind: ActivityKind
  message: string
  createdAt: string
}

export interface DashboardPayload {
  stats: DashboardStats
  donationTrends: DonationTrendPoint[]
  activity: ActivityItem[]
}

export interface BlogCategory {
  id: string
  title: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  coverImage: string | null
  categoryId: string | null
  author: string
  tags: string[]
  metaDescription: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EventItem {
  id: string
  title: string
  description: string
  image: string | null
  location: string
  venueAddress: string | null
  startDate: string
  endDate: string | null
  type: string
  registrationLimit: number | null
  organizerName: string | null
  contactNumber: string | null
  slug: string | null
  metaTitle: string | null
  metaDescription: string | null
  focusKeywords: string[]
  isIndexed: boolean
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export type AdSlot = 'leaderboard' | 'banner' | 'rectangle'
/** image = the picture is the whole ad; split = coloured panel with headline, text and button beside a picture. */
export type AdTemplate = 'image' | 'split'
export type AdTheme = 'maroon' | 'navy' | 'charcoal' | 'forest' | 'royal' | 'teal' | 'custom'

/** How the ad slots on the site rotate (one set of rules for the whole site). */
export interface AdRotation {
  seconds: number
  /** tiles = current ad in the middle with the next and previous behind it at the sides; fade = one ad at a time. */
  transition: 'tiles' | 'fade'
  pauseOnHover: boolean
}

export interface AdItem {
  id: string
  title: string | null
  advertiser: string | null
  adType: string | null
  placement: AdSlot
  page: string | null
  imageUrl: string | null
  linkUrl: string | null
  ctaLabel: string | null
  template: AdTemplate
  headline: string | null
  subline: string | null
  theme: AdTheme
  bgFrom: string | null
  bgTo: string | null
  ctaColor: string | null
  /** The 1st, 2nd... spot of its size on the page (top to bottom); null = any spot. */
  slotPosition: number | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  impressions: number
  clicks: number
  revenueRupees: string | number
  priority: 'low' | 'medium' | 'high'
  description: string | null
  isDraft: boolean
  createdAt: string
  updatedAt: string
}

export type RegistrationType = 'artist' | 'dancer' | 'musician' | 'temple' | 'dharamshala' | 'mandal'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'blocked'

/** One line of the admin registrations table, across every category. */
export interface RegistrationRow {
  id: string
  userId: string
  type: RegistrationType
  status: RegistrationStatus
  displayName: string
  fullName: string
  email: string
  phone: string
  createdAt: string
  /** False when the person submitted with required details still blank. */
  isComplete: boolean
  /** Keys of the required details still missing. */
  missing: string[]
}

/** A registration's full profile plus its owner's account, as the detail panel shows it. */
export interface RegistrationDetail {
  id: string
  userId: string
  status: RegistrationStatus
  adminNote: string | null
  missingFields: string[]
  createdAt: string
  updatedAt: string
  account: { id: string; fullName: string; email: string; mobile: string } | null
  [field: string]: unknown
}

export type NotificationKind = 'info' | 'success' | 'warning'

export interface SentNotification {
  id: string
  userId: string
  kind: NotificationKind
  title: string | null
  message: string
  link: string | null
  createdAt: string
  readAt: string | null
}
