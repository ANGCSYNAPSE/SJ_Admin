export type UserRole = 'member' | 'artist' | 'temple_admin' | 'admin'

export interface AdminUser {
  id: string
  fullName: string
  email: string
  mobile: string
  role: UserRole
  isVerified: boolean
  isBlocked?: boolean
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
