import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/layout/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Login } from './pages/auth/Login'
import { ForgotPassword } from './pages/auth/ForgotPassword'
import { ResetPassword } from './pages/auth/ResetPassword'
import { BlogPosts } from './pages/blog/BlogPosts'
import { BlogPostForm } from './pages/blog/BlogPostForm'
import { Events } from './pages/events/Events'
import { EventForm } from './pages/events/EventForm'
import { Users } from './pages/users/Users'
import { UserForm } from './pages/users/UserForm'
import { Ads } from './pages/ads/Ads'
import { AdForm } from './pages/ads/AdForm'
import { Registrations } from './pages/registrations/Registrations'
import { Profile } from './pages/profile/Profile'
import { Payments } from './pages/payments/Payments'
import { ComingSoon } from './pages/ComingSoon'
import { navItems } from './components/layout/navConfig'

const builtPaths = new Set(['/', '/blog-posts', '/events', '/users', '/advertisement', '/registrations', '/payments'])
const placeholderPaths = navItems.map((item) => item.path).filter((path) => !builtPaths.has(path))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/blog-posts" element={<BlogPosts />} />
          <Route path="/blog-posts/new" element={<BlogPostForm />} />
          <Route path="/blog-posts/:id/edit" element={<BlogPostForm />} />
          <Route path="/users" element={<Users />} />
          <Route path="/advertisement" element={<Ads />} />
          <Route path="/advertisement/new" element={<AdForm />} />
          <Route path="/advertisement/:id/edit" element={<AdForm />} />
          <Route path="/users/new" element={<UserForm />} />
          <Route path="/users/:id/edit" element={<UserForm />} />
          <Route path="/registrations" element={<Registrations />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/new" element={<EventForm />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          {placeholderPaths.map((path) => (
            <Route key={path} path={path} element={<ComingSoon />} />
          ))}
        </Route>
      </Route>
    </Routes>
  )
}

export default App
