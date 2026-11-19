import { Outlet, useLocation } from 'react-router-dom'
import { Header, type BreadcrumbItem } from './Header'
import { Sidebar } from './Sidebar'
import { navItems } from './navConfig'

const titleOverrides: Record<string, string> = {
  '/': 'Devotional Ecosystem Overview',
  '/blog-posts': 'Blog & Sacred Knowledge Management',
  '/events': 'Devotional and Seva Events Coordinator',
  '/users': 'Registered Devotees & User Directory',
  '/advertisement': 'Advertisement Management',
  '/registrations': 'Registrations: Artists, Temples, Dharamshalas & More',
  '/payments': 'Registration Fee: Collected, Pending & Settings',
  '/notifications': 'Notification Centre: Message Devotees',
  '/verification': 'Account Verification: Email, Phone & Admin',
  '/profile': 'My Profile',
}

const blogBreadcrumbBase: BreadcrumbItem[] = [{ label: 'Dashboard', to: '/' }, { label: 'Blog Posts', to: '/blog-posts' }]
const eventsBreadcrumbBase: BreadcrumbItem[] = [{ label: 'Dashboard', to: '/' }, { label: 'Events', to: '/events' }]

const adsBreadcrumbBase: BreadcrumbItem[] = [{ label: 'Dashboard', to: '/' }, { label: 'Advertisements', to: '/advertisement' }]
const usersBreadcrumbBase: BreadcrumbItem[] = [{ label: 'Dashboard', to: '/' }, { label: 'Users', to: '/users' }]

function headerForPath(pathname: string): { title: string; breadcrumb?: BreadcrumbItem[] } {
  if (pathname === '/advertisement') {
    return { title: titleOverrides[pathname], breadcrumb: [{ label: 'Dashboard', to: '/' }, { label: 'Advertisements' }] }
  }
  if (pathname === '/advertisement/new') {
    return { title: 'Add New Advertisement', breadcrumb: [...adsBreadcrumbBase, { label: 'Add New' }] }
  }
  if (/^\/advertisement\/[^/]+\/edit$/.test(pathname)) {
    return { title: 'Edit Advertisement', breadcrumb: [...adsBreadcrumbBase, { label: 'Edit' }] }
  }
  if (pathname === '/blog-posts/new') {
    return { title: 'Add New Blog Post', breadcrumb: [...blogBreadcrumbBase, { label: 'Add New' }] }
  }
  if (/^\/blog-posts\/[^/]+\/edit$/.test(pathname)) {
    return { title: 'Edit Blog Post', breadcrumb: [...blogBreadcrumbBase, { label: 'Edit' }] }
  }
  if (pathname === '/users/new') {
    return { title: 'Add New User', breadcrumb: [...usersBreadcrumbBase, { label: 'Add New' }] }
  }
  if (/^\/users\/[^/]+\/edit$/.test(pathname)) {
    return { title: 'Edit User', breadcrumb: [...usersBreadcrumbBase, { label: 'Edit User' }] }
  }
  if (pathname === '/events/new') {
    return { title: 'Create New Event', breadcrumb: [...eventsBreadcrumbBase, { label: 'Create New' }] }
  }
  if (/^\/events\/[^/]+\/edit$/.test(pathname)) {
    return { title: 'Edit Event', breadcrumb: [...eventsBreadcrumbBase, { label: 'Edit' }] }
  }
  if (titleOverrides[pathname]) return { title: titleOverrides[pathname] }
  const match = navItems.find((item) => item.path === pathname)
  return { title: match?.label ?? 'Admin Panel' }
}

export function AdminLayout() {
  const location = useLocation()
  const { title, breadcrumb } = headerForPath(location.pathname)

  return (
    <div className="min-h-svh bg-page">
      <Sidebar />
      <div className="flex min-h-svh flex-col pl-60">
        <Header title={title} breadcrumb={breadcrumb} />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
