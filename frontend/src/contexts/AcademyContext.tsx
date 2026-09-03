import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { pickAcademyRole } from '../lib/academy-permissions'
import type { UserAcademyRole } from '../lib/types'

interface AcademyContextValue {
  activeAcademyId: string | null
  activeRole: UserAcademyRole | null
  academyRoles: UserAcademyRole[]
  setActiveAcademyId: (id: string) => void
}

const AcademyContext = createContext<AcademyContextValue | null>(null)

const STORAGE_KEY = 'ringpro_active_academy'

export function AcademyProvider({ children }: { children: ReactNode }) {
  const { roles, primaryRole } = useAuth()
  const [activeAcademyId, setActiveAcademyIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  )

  const academyRoles = useMemo(
    () =>
      roles.filter(
        (r) =>
          r.academy_id &&
          r.role !== 'PLATFORM_OWNER' &&
          r.role !== 'PLATFORM_SUPPORT' &&
          r.role !== 'PLATFORM_FINANCE',
      ),
    [roles],
  )

  useEffect(() => {
    if (
      primaryRole === 'PLATFORM_OWNER' ||
      primaryRole === 'PLATFORM_SUPPORT' ||
      primaryRole === 'PLATFORM_FINANCE'
    ) {
      return
    }
    if (academyRoles.length === 0) {
      setActiveAcademyIdState(null)
      return
    }
    const stored = localStorage.getItem(STORAGE_KEY)
    const valid = academyRoles.some((r) => r.academy_id === stored)
    if (!valid) {
      const first = academyRoles[0].academy_id
      if (first) {
        setActiveAcademyIdState(first)
        localStorage.setItem(STORAGE_KEY, first)
      }
    }
  }, [academyRoles, primaryRole])

  const setActiveAcademyId = useCallback((id: string) => {
    setActiveAcademyIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const activeRole = useMemo(
    () => (activeAcademyId ? pickAcademyRole(academyRoles, activeAcademyId) : null),
    [academyRoles, activeAcademyId],
  )

  return (
    <AcademyContext.Provider
      value={{ activeAcademyId, activeRole, academyRoles, setActiveAcademyId }}
    >
      {children}
    </AcademyContext.Provider>
  )
}

export function useAcademyContext() {
  const ctx = useContext(AcademyContext)
  if (!ctx) throw new Error('useAcademyContext must be used within AcademyProvider')
  return ctx
}

export function useUserRoles() {
  const { roles, primaryRole } = useAuth()
  return { roles, primaryRole }
}
