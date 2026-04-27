import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../../app/store/authStore'
import { useMe } from '../hooks/useMe'

interface RequireRolesProps {
  children: ReactNode
  roles: string[]
}

/**
 * Guards routes that require specific roles.
 *
 * - No accessToken → redirect to /login
 * - Token valid but loading → spinner
 * - User doesn't have any required role → redirect to /
 * - Otherwise → render children
 */
export function RequireRoles({ children, roles }: RequireRolesProps): JSX.Element {
  const accessToken = useAuthStore((s) => s.accessToken)
  const { data: user, isLoading, isError } = useMe()

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

  if (isError || !user) {
    return <Navigate to="/login" replace />
  }

  const hasRole = roles.some((r) => user.roles.includes(r))
  if (!hasRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
