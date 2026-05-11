import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
import { configureClientStore } from '../shared/api/client'
import { useAuthStore } from './store/authStore'

/** Extract a human-readable message from any error shape */
function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    // Axios error: error.response.data.detail
    const axiosError = error as {
      response?: { data?: { detail?: string } }
      message?: string
    }
    const detail = axiosError.response?.data?.detail
    if (typeof detail === 'string' && detail.length > 0) return detail
    if (typeof axiosError.message === 'string') return axiosError.message
  }
  if (typeof error === 'string') return error
  return 'Ocurrió un error inesperado'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        toast.error(extractErrorMessage(error))
      },
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
      <Toaster
        position="top-right"
        expand
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: 'font-sans text-sm rounded-card shadow-popover',
          },
        }}
      />
    </QueryClientProvider>
  )
}
