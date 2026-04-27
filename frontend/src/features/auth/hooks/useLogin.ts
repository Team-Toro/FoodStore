import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store/authStore'
import { login } from '../api/authApi'
import type { LoginRequest } from '../types'

const REFRESH_TOKEN_KEY = 'food-store-refresh'

export function useLogin() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (tokens) => {
      setAccessToken(tokens.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
      // Pre-populate the 'me' query cache so the user profile is immediately available
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
