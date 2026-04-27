import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../app/store/authStore'
import { me } from '../api/authApi'
import type { User } from '../types'

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken)

  return useQuery<User>({
    queryKey: ['me'],
    queryFn: me,
    enabled: !!accessToken,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
