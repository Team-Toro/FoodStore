import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store/authStore'
import { logout } from '../api/authApi'

const REFRESH_TOKEN_KEY = 'food-store-refresh'

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (refreshToken) {
        await logout(refreshToken)
      }
    },
    onSuccess: () => {
      clearAuth()
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      queryClient.clear()
    },
    onError: () => {
      // Even on error, clear local state
      clearAuth()
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      queryClient.clear()
    },
  })
}
