import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function LandingLayout({
  children,
  academyName,
  logoUrl,
}: {
  children: ReactNode
  academyName?: string
  logoUrl?: string
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : null}
            <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-[var(--color-primary)]">
              {academyName ?? 'RINGPRO'}
            </span>
          </div>
          <Link
            to="/login"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            Área do aluno
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
