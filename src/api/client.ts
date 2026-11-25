import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope, AuthResult } from '../types/api'

/**
 * VITE_API_BASE_URL should be the full address, e.g. https://ssj-backend-seven.vercel.app/api/v1. A value
 * missing "https://" is read by the browser as a path on the admin's own site (requests then go to
 * <admin>/ssj-backend-seven.vercel.app/... and fail with 405), so the protocol and the /api/v1 suffix are
 * filled in when they were left out.
 */
function normalizeBaseUrl(raw: string | undefined): string {
  let value = (raw ?? '').trim().replace(/\/+$/, '')
  if (!value) return value
  if (!/^https?:\/\//i.test(value)) value = `${/^(localhost|127\.0\.0\.1)/i.test(value) ? 'http' : 'https'}://${value}`
  if (!/\/api\/v1$/i.test(value)) value = `${value}/api/v1`
  return value
}

/**
 * A deployed admin does NOT call the backend's own address from the browser. It calls its own /api/v1/..., and Vercel
 * forwards the request to the backend (see vercel.json). That makes the sign-in cookie first-party, so the session
 * survives a page refresh in every browser: Safari, Brave and Chrome all drop the cookie of a different site, which
 * is what sent the admin back to the login screen on every refresh. Running locally still talks to the backend directly.
 */
const rawBase = import.meta.env.VITE_API_BASE_URL
const pointsAtThisMachine = /^(https?:\/\/)?(localhost|127\.0\.0\.1)/i.test((rawBase ?? '').trim())
const baseURL = import.meta.env.PROD && !pointsAtThisMachine ? '/api/v1' : normalizeBaseUrl(rawBase)

/** Origin the backend serves static /uploads from (baseURL minus the /api/v1 suffix). */
export const apiOrigin = baseURL.replace(/\/api\/v1\/?$/, '')

export function resolveUploadUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl
  return `${apiOrigin}${pathOrUrl}`
}

export const api = axios.create({
  baseURL,
  withCredentials: true, // sends/receives the httpOnly refresh cookie
})

// Anything an admin changes (an approval, a rejection, a reply) may change what is still waiting, so the badges on the menu
// are asked to read their numbers again (see components/layout/usePendingCounts.ts).
api.interceptors.response.use((response) => {
  const method = response.config.method?.toLowerCase()
  if (method && method !== 'get' && (response.config.url ?? '').startsWith('/admin')) {
    window.dispatchEvent(new Event('admin:pending-changed'))
  }
  return response
})

let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/**
 * Exchanges the refresh cookie for a fresh access token; null if the session is gone. Calls that overlap (React's double
 * render in development, a page and a retried request at once) share ONE request: the server swaps the cookie on every
 * refresh, so two at the same moment would otherwise look like a replayed token.
 */
let refreshing: Promise<string | null> | null = null
function refreshAccessToken(): Promise<string | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await axios.post<ApiEnvelope<AuthResult | null>>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
    // data is null when there is no session cookie: nobody is signed in.
    if (!res.data.data) {
      setAccessToken(null)
      return null
    }
    const token = res.data.data.accessToken
    setAccessToken(token)
    return token
  } catch {
    setAccessToken(null)
    return null
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const token = await refreshPromise
      if (token) {
        original.headers.set('Authorization', `Bearer ${token}`)
        return api(original)
      }
    }

    return Promise.reject(error)
  },
)

export { refreshAccessToken }

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiEnvelope<unknown> | undefined
    if (data?.message) return data.message
  }
  return fallback
}

/** The message plus the per-field messages of a rejected request, e.g. { currentPassword: "…not right." }. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {}
  const data = error.response?.data as { errors?: { field: string; message: string }[] | null } | undefined
  return Object.fromEntries((data?.errors ?? []).map((e) => [e.field, e.message]))
}
