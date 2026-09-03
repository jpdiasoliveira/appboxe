import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAcademyContext } from '../contexts/AcademyContext'
import { canManageAcademy } from '../lib/academy-permissions'

interface AcademyOwnerGuardProps {
  children: ReactNode
}

/** Bloqueia professor/assistant mesmo digitando a URL. */
export function AcademyOwnerGuard({ children }: AcademyOwnerGuardProps) {
  const { activeRole } = useAcademyContext()
  const allowed = activeRole ? canManageAcademy([activeRole]) : false

  if (!allowed) {
    return <Navigate to="/academy/dashboard" replace />
  }

  return <>{children}</>
}
