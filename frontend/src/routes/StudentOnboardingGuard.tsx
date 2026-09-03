import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useStudentContext } from '../contexts/StudentContext'

export function StudentOnboardingGuard() {
  const { student, loading, needsOnboarding } = useStudentContext()
  const location = useLocation()
  const onOnboarding = location.pathname === '/student/onboarding'
  const onCheckIn = location.pathname.startsWith('/student/check-in/')

  if (loading) {
    return <p className="p-6 text-sm text-[var(--color-text-muted)]">Carregando...</p>
  }

  if (!student) {
    return <Outlet />
  }

  if (needsOnboarding && !onOnboarding && !onCheckIn) {
    return <Navigate to="/student/onboarding" replace />
  }

  if (!needsOnboarding && onOnboarding) {
    return <Navigate to="/student/dashboard" replace />
  }

  return <Outlet />
}
