import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../../app/store/authStore'
import { useMe } from '../hooks/useMe'
import { Spinner } from '../../../shared/ui/Spinner'

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
        <Spinner size="lg" />
      </div>
    )
  }

  if (isError) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
