import { Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function AcademyOnboardingLayout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
        <span className="text-lg font-bold tracking-tight text-[var(--color-primary)]">RINGPRO</span>
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <span className="hidden sm:inline">{profile?.name}</span>
          <button
            type="button"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => void signOut()}
          >
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
