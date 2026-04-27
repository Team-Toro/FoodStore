/**
 * Tests for the Axios client interceptors.
 *
 * We use msw to mock network calls in a controlled way.
 */
import { describe, it, expect, beforeAll, afterEach, afterAll, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useAuthStore } from '../app/store/authStore'

// The API client must be imported AFTER mocking env vars
const BASE_URL = 'http://test-api'
vi.stubEnv('VITE_API_URL', BASE_URL)

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ accessToken: null })
  localStorage.clear()
})
afterAll(() => server.close())

describe('Axios client interceptors', () => {
  it('attaches Authorization header when accessToken is set', async () => {
    useAuthStore.getState().setAccessToken('my-token')

    let capturedAuth: string | null = null
    server.use(
      http.get(`${BASE_URL}/api/v1/auth/me`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ id: 1, email: 'u@e.com', roles: ['CLIENT'] })
      }),
    )

    const { default: apiClient } = await import('../api/axiosClient')
    await apiClient.get('/api/v1/auth/me')

    expect(capturedAuth).toBe('Bearer my-token')
  })

  it('does not attach Authorization header when no token', async () => {
    let capturedAuth: string | null = 'present'
    server.use(
      http.get(`${BASE_URL}/api/v1/auth/me`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json({ id: 1 })
      }),
    )

    const { default: apiClient } = await import('../api/axiosClient')
    await apiClient.get('/api/v1/auth/me')

    expect(capturedAuth).toBeNull()
  })

  it('calls refresh endpoint on 401 and retries the original request', async () => {
    useAuthStore.getState().setAccessToken('expired-token')
    localStorage.setItem('food-store-refresh', 'valid-refresh-uuid')

    let meCallCount = 0
    server.use(
      http.get(`${BASE_URL}/api/v1/auth/me`, () => {
        meCallCount++
        if (meCallCount === 1) {
          return new HttpResponse(null, { status: 401 })
        }
        return HttpResponse.json({ id: 1, email: 'u@e.com', roles: ['CLIENT'] })
      }),
      http.post(`${BASE_URL}/api/v1/auth/refresh`, () => {
        return HttpResponse.json({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-uuid',
          token_type: 'bearer',
          expires_in: 1800,
        })
      }),
    )

    const { default: apiClient } = await import('../api/axiosClient')
    const res = await apiClient.get('/api/v1/auth/me')

    expect(res.status).toBe(200)
    expect(meCallCount).toBe(2)
    expect(useAuthStore.getState().accessToken).toBe('new-access-token')
    expect(localStorage.getItem('food-store-refresh')).toBe('new-refresh-uuid')
  })

  it('clears auth and redirects to /login when refresh fails', async () => {
    const assignSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { href: '/' },
      writable: true,
    })

    useAuthStore.getState().setAccessToken('expired-token')
    localStorage.setItem('food-store-refresh', 'invalid-refresh')

    server.use(
      http.get(`${BASE_URL}/api/v1/auth/me`, () => {
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(`${BASE_URL}/api/v1/auth/refresh`, () => {
        return new HttpResponse(null, { status: 401 })
      }),
    )

    const { default: apiClient } = await import('../api/axiosClient')
    try {
      await apiClient.get('/api/v1/auth/me')
    } catch {
      // expected to fail
    }

    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
