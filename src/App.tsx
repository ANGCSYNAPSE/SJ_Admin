import { Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/layout/AdminLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Login } from './pages/auth/Login'
import { BlogPosts } from './pages/blog/BlogPosts'
import { BlogPostForm } from './pages/blog/BlogPostForm'
import { Events } from './pages/events/Events'
import { EventForm } from './pages/events/EventForm'
import { ComingSoon } from './pages/ComingSoon'
import { navItems } from './components/layout/navConfig'

const builtPaths = new Set(['/', '/blog-posts', '/events'])
const placeholderPaths = navItems.map((item) => item.path).filter((path) => !builtPaths.has(path))

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/blog-posts" element={<BlogPosts />} />
          <Route path="/blog-posts/new" element={<BlogPostForm />} />
          <Route path="/blog-posts/:id/edit" element={<BlogPostForm />} />
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
