import {
  Award,
  Building,
  Calendar,
  FileText,
  Folder,
  Heart,
  Home,
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
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Blog Posts', path: '/blog-posts', icon: SquarePen },
  { label: 'Events', path: '/events', icon: Calendar },
  { label: 'Donations', path: '/donations', icon: Heart },
  { label: 'Temples', path: '/temples', icon: Building },
  { label: 'Artists', path: '/artists', icon: Users },
  { label: 'Dharamshalas', path: '/dharamshalas', icon: Home },
  { label: 'Organisations', path: '/organisations', icon: Folder },
  { label: 'Communities', path: '/communities', icon: MessageSquare },
  // { label: 'Products', path: '/products', icon: ShoppingBag },
  { label: 'Advertisement', path: '/advertisement', icon: Megaphone },
  { label: 'Volunteers', path: '/volunteers', icon: Shield },
  { label: 'Team/Leadership', path: '/team-leadership', icon: Award },
  { label: 'Users', path: '/users', icon: User },
  { label: 'Contact Inquiries', path: '/contact-inquiries', icon: Mail },
  { label: 'Registrations', path: '/registrations', icon: FileText },
  { label: 'Settings', path: '/settings', icon: Settings },
]
