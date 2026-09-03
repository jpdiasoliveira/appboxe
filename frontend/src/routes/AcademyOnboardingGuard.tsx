import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAcademyContext } from '../contexts/AcademyContext'
import { fetchAcademySettings } from '../features/academy/academy-api'
import { canManageAcademy } from '../lib/academy-permissions'
import { needsAcademyOnboarding, parseAcademySettings } from '../lib/academy-settings'

export function AcademyOnboardingGuard() {
  const { activeAcademyId, activeRole } = useAcademyContext()
  const location = useLocation()
  const onOnboarding = location.pathname === '/academy/onboarding'
  const isOwner = activeRole ? canManageAcademy([activeRole]) : false

  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => {
    if (!activeAcademyId || !isOwner) {
      setNeedsOnboarding(false)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchAcademySettings(activeAcademyId)
      .then((data) => {
        const settings = parseAcademySettings(data.settings)
        setNeedsOnboarding(needsAcademyOnboarding(settings))
      })
      .catch(() => setNeedsOnboarding(false))
      .finally(() => setLoading(false))
  }, [activeAcademyId, isOwner])

  if (loading) {
    return <p className="p-6 text-sm text-[var(--color-text-muted)]">Carregando...</p>
  }

  if (isOwner && needsOnboarding && !onOnboarding) {
    return <Navigate to="/academy/onboarding" replace />
  }

  if (onOnboarding && (!isOwner || !needsOnboarding)) {
    return <Navigate to="/academy/dashboard" replace />
  }

  return <Outlet />
}
