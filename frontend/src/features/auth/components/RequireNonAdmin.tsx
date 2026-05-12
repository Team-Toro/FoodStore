import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../../app/store/authStore'
import { useMe } from '../hooks/useMe'
import { Spinner } from '../../../shared/ui/Spinner'

interface RequireNonAdminProps {
  children: ReactNode
}

/**
 * Guards routes that ADMIN users should not access (cart/checkout/client flows).
 *
 * - No accessToken → redirect to /login
 * - Loading → spinner
 * - User has ADMIN role → redirect to /admin
 * - Otherwise → render children
 */
export function RequireNonAdmin({ children }: RequireNonAdminProps): JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: user, isLoading, isError } = useMe()

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

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.roles.includes('ADMIN')) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
