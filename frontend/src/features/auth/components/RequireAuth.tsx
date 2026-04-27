import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../../app/store/authStore'
import { useMe } from '../hooks/useMe'

interface RequireAuthProps {
  children: ReactNode
}

/**
 * Guards routes that require authentication.
 *
 * Behaviour:
 * - No accessToken in store → redirect to /login immediately.
 * - accessToken exists → fire useMe() to validate session server-side.
 *   - Loading → show a spinner.
 *   - /me returns 401 → authStore was already cleared by axiosClient interceptor → redirect to /login.
 *   - /me succeeds → render children.
 */
export function RequireAuth({ children }: RequireAuthProps): JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { isLoading, isError } = useMe()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (isError) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
