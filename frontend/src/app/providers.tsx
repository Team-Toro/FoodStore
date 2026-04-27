import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { configureClientStore } from '../shared/api/client'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps): JSX.Element {
  useEffect(() => {
    // Wire up the Axios client to the auth store so interceptors can read tokens
    configureClientStore({
      getAccessToken: () => useAuthStore.getState().accessToken,
      setTokens: (accessToken) => useAuthStore.getState().setAccessToken(accessToken),
      clearSession: () => useAuthStore.getState().logout(),
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
