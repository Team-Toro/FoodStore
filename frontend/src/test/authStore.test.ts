import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../app/store/authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state and localStorage before each test
    useAuthStore.setState({ accessToken: null })
    localStorage.clear()
  })

  it('initially has no accessToken', () => {
    const { accessToken } = useAuthStore.getState()
    expect(accessToken).toBeNull()
  })

  it('setAccessToken stores the token', () => {
    useAuthStore.getState().setAccessToken('test-token-abc')
    expect(useAuthStore.getState().accessToken).toBe('test-token-abc')
  })

  it('clearAuth removes the accessToken', () => {
    useAuthStore.getState().setAccessToken('test-token-abc')
    useAuthStore.getState().clearAuth()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('logout (alias) removes the accessToken', () => {
    useAuthStore.getState().setAccessToken('test-token-abc')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('persists accessToken to localStorage under food-store-auth key', () => {
    useAuthStore.getState().setAccessToken('my-access-token')
    // The persisted value is JSON-encoded by zustand/persist
    const stored = localStorage.getItem('food-store-auth')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.state.accessToken).toBe('my-access-token')
  })

  it('clearAuth removes accessToken from localStorage', () => {
    useAuthStore.getState().setAccessToken('my-access-token')
    useAuthStore.getState().clearAuth()
    const stored = localStorage.getItem('food-store-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      expect(parsed.state.accessToken).toBeNull()
    } else {
      // If no stored value, that's also acceptable
      expect(stored).toBeNull()
    }
  })
})
