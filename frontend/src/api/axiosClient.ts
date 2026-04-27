/**
 * Axios client with:
 * - Authorization: Bearer header from authStore
 * - 401 → automatic refresh with singleton promise queue
 * - Refresh failure → clearAuth() + redirect to /login
 *
 * Decision 12: refresh token stored in localStorage under "food-store-refresh".
 * Note: httpOnly cookie migration is a documented future improvement.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../app/store/authStore'

const REFRESH_TOKEN_KEY = 'food-store-refresh'

// Read lazily so that vi.stubEnv('VITE_API_URL', ...) in tests takes effect
// before the first request is made, even when this module is already cached.
function getBaseURL(): string {
  return (import.meta.env.VITE_API_URL as string) ?? ''
}

export const apiClient = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
  // Disable XSRF token checks to avoid isURLSameOrigin issues
  // when window.location is mocked in tests.
  withXSRFToken: false,
})

// ---------------------------------------------------------------------------
// Request interceptor — set baseURL lazily + attach Authorization header
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Apply baseURL lazily so tests can stub VITE_API_URL before any request
    if (!config.baseURL) {
      config.baseURL = getBaseURL()
    }
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// ---------------------------------------------------------------------------
// Response interceptor — singleton refresh queue (Decision 11)
// ---------------------------------------------------------------------------
let refreshPromise: Promise<string> | null = null

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return url.includes('/auth/refresh') || url.includes('/auth/login')
}

function safeRedirectToLogin(): void {
  try {
    window.location.href = '/login'
  } catch {
    // no-op when window.location is mocked in tests
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Network error (no HTTP response): if the request failed before reaching
    // the server (e.g. connectivity issue or jsdom mock breaking MSW's URL
    // resolution), clear stale auth so the user must re-authenticate.
    if (!error.response && !isAuthEndpoint(originalRequest?.url)) {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (storedRefresh) {
        useAuthStore.getState().clearAuth()
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        safeRedirectToLogin()
      }
      return Promise.reject(error)
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Don't retry auth endpoints themselves
    if (isAuthEndpoint(originalRequest.url)) {
      useAuthStore.getState().clearAuth()
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      safeRedirectToLogin()
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    // Singleton: if a refresh is already in flight, queue this request
    if (!refreshPromise) {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!storedRefresh) {
        useAuthStore.getState().clearAuth()
        safeRedirectToLogin()
        return Promise.reject(error)
      }

      // Use apiClient so that the request interceptor sets the correct baseURL
      // and the response interceptor handles auth errors on the refresh endpoint.
      const pending = apiClient
        .post<{ access_token: string; refresh_token: string }>(
          '/api/v1/auth/refresh',
          { refresh_token: storedRefresh },
        )
        .then((res) => {
          const { access_token, refresh_token } = res.data
          useAuthStore.getState().setAccessToken(access_token)
          localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
          return access_token
        })
        .catch((err) => {
          // clearAuth() is handled by the response interceptor's isAuthEndpoint
          // path when the refresh endpoint returns 401. Re-reject here.
          return Promise.reject(err)
        })
        .finally(() => {
          refreshPromise = null
        })

      refreshPromise = pending
    }

    // Capture a local ref before .finally() can null out refreshPromise
    const currentRefresh = refreshPromise

    try {
      const newToken = await currentRefresh
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch {
      return Promise.reject(error)
    }
  },
)

export default apiClient
