/**
 * Shared Axios client — configured via configureClientStore() in providers.tsx.
 *
 * This client handles the 401 → refresh token rotation with a singleton promise queue.
 * Refresh token is read from localStorage under the key "food-store-refresh".
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const REFRESH_TOKEN_KEY = 'food-store-refresh'

// ---------------------------------------------------------------------------
// Lazy store bindings — set via configureClientStore() to avoid circular imports
// ---------------------------------------------------------------------------
let getAccessToken: (() => string | null) | null = null
let setTokens: ((accessToken: string) => void) | null = null
let clearSession: (() => void) | null = null

export function configureClientStore(opts: {
  getAccessToken: () => string | null
  setTokens: (accessToken: string) => void
  clearSession: () => void
}): void {
  getAccessToken = opts.getAccessToken
  setTokens = opts.setTokens
  clearSession = opts.clearSession
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken?.()
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// Singleton refresh state
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

function processQueue(newToken: string): void {
  refreshQueue.forEach((resolve) => resolve(newToken))
  refreshQueue = []
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false
  return url.includes('/auth/refresh') || url.includes('/auth/login')
}

// Response interceptor: handle 401 with automatic token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Don't retry auth endpoints
    if (isAuthEndpoint(originalRequest.url)) {
      clearSession?.()
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      return new Promise<string>((resolve) => {
        refreshQueue.push(resolve)
      }).then((token) => {
        originalRequest.headers['Authorization'] = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    isRefreshing = true

    try {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!storedRefresh) {
        clearSession?.()
        return Promise.reject(error)
      }

      const { data } = await axios.post<{
        access_token: string
        refresh_token: string
      }>(
        `${import.meta.env.VITE_API_URL as string}/api/v1/auth/refresh`,
        { refresh_token: storedRefresh },
      )
      const newToken = data.access_token
      setTokens?.(newToken)
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token)
      processQueue(newToken)
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch {
      clearSession?.()
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default apiClient
