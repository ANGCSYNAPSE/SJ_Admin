export type UserRole = 'member' | 'artist' | 'temple_admin' | 'admin'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  mobile: string
  role: UserRole
  isVerified: boolean
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

export interface AdItem {
  id: string
  title: string | null
  advertiser: string | null
  adType: string | null
  placement: AdSlot
  page: string | null
  imageUrl: string
  linkUrl: string | null
  ctaLabel: string | null
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
