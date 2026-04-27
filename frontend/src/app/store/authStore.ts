import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  // Actions
  setAccessToken: (accessToken: string) => void
  clearAuth: () => void
  /** @alias clearAuth — kept for backwards compat with providers.tsx */
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,

      setAccessToken(accessToken: string): void {
        set({ accessToken })
      },

      clearAuth(): void {
        set({ accessToken: null })
      },

      /** Alias for clearAuth — providers.tsx calls this */
      logout(): void {
        set({ accessToken: null })
      },
    }),
    {
      name: 'food-store-auth',
      // Only persist the access token — user profile is reconstructed via /auth/me on reload
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
)
