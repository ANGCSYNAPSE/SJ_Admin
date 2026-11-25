import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // While developing, the admin asks its OWN address for /api/v1 and /uploads, and this server forwards them to the backend
  // named in VITE_API_BASE_URL (the same thing vercel.json does for the deployed admin). That keeps the sign-in cookie
  // first-party, so the session survives a refresh. Called straight, a backend on another site (https://…vercel.app)
  // sets a third-party cookie, which most browsers refuse, and the admin would fall back to the login screen on every refresh.
  const env = loadEnv(mode, process.cwd(), '')
  const raw = (env.VITE_API_BASE_URL ?? '').trim().replace(/\/api\/v1\/?$/i, '').replace(/\/+$/, '')
  const target = !raw ? 'http://localhost:5000' : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  }
})
