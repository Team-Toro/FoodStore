import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store/authStore'
import { register } from '../api/authApi'
import type { RegisterRequest } from '../types'

const REFRESH_TOKEN_KEY = 'food-store-refresh'

export function useRegister() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RegisterRequest) => register(data),
    onSuccess: (tokens) => {
      setAccessToken(tokens.access_token)
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })
}
