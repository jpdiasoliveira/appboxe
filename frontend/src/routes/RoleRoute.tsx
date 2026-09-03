import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { hasRole } from '../lib/auth-utils'
import type { UserRole } from '../lib/types'

interface RoleRouteProps {
  children: ReactNode
  allowed: UserRole[]
}

export function RoleRoute({ children, allowed }: RoleRouteProps) {
  const { roles, loading, primaryRole } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Carregando...
      </div>
    )
  }

  const ok = allowed.some((role) => hasRole(roles, role))
  if (!ok) {
    if (primaryRole) {
      const map: Record<UserRole, string> = {
        PLATFORM_OWNER: '/platform/dashboard',
        PLATFORM_SUPPORT: '/platform/dashboard',
        PLATFORM_FINANCE: '/platform/dashboard',
        SCHOOL_OWNER: '/academy/dashboard',
        PROFESSOR: '/academy/dashboard',
        ASSISTANT: '/academy/dashboard',
        STUDENT: '/student/dashboard',
      }
      return <Navigate to={map[primaryRole]} replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
