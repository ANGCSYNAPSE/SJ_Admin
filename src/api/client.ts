import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiEnvelope, AuthResult } from '../types/api'

const baseURL = import.meta.env.VITE_API_BASE_URL

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

let accessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Exchanges the refresh cookie for a fresh access token; null if the session is gone. */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post<ApiEnvelope<AuthResult>>(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    )
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
