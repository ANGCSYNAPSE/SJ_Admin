import type { PendingCounts } from '../../api/pending'
import {
  Award,
  Bell,
  ShieldCheck,
  Building,
  Calendar,
  FileText,
  Folder,
  Heart,
  Home,
  Images,
  IndianRupee,
  Mail,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  SquarePen,
  User,
  Users,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  /** The key of the number (in GET /admin/dashboard/pending) shown as a badge on this item while something waits. */
  pending?: keyof PendingCounts
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Blog Posts', path: '/blog-posts', icon: SquarePen },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Donations', path: '/donations', icon: Heart },
  { label: 'Temples', path: '/temples', icon: Building, pending: 'temples' },
  { label: 'Artists', path: '/artists', icon: Users, pending: 'artists' },
  { label: 'Dharamshalas', path: '/dharamshalas', icon: Home, pending: 'dharamshalas' },
  { label: 'Organisations', path: '/organisations', icon: Folder, pending: 'organisations' },
  { label: 'Communities', path: '/communities', icon: MessageSquare },
  // { label: 'Products', path: '/products', icon: ShoppingBag },
  { label: 'Advertisement', path: '/advertisement', icon: Megaphone },
  { label: 'Volunteers', path: '/volunteers', icon: Shield, pending: 'volunteers' },
  { label: 'Gallery', path: '/gallery', icon: Images, pending: 'gallery' },
  { label: 'Team/Leadership', path: '/team-leadership', icon: Award },
  { label: 'Users', path: '/users', icon: User },
  { label: 'Contact Inquiries', path: '/contact-inquiries', icon: Mail, pending: 'contactInquiries' },
  { label: 'Registrations', path: '/registrations', icon: FileText, pending: 'registrations' },
  { label: 'Payments', path: '/payments', icon: IndianRupee },
  { label: 'Verification', path: '/verification', icon: ShieldCheck, pending: 'verification' },
  { label: 'Notifications', path: '/notifications', icon: Bell },
  { label: 'Settings', path: '/settings', icon: Settings },
]
