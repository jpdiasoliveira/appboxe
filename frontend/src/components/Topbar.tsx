import { ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'
import { Button } from './ui/Button'

interface TopbarProps {
  title?: string
  userName?: string
  onLogout: () => void
  onMenuClick?: () => void
  extra?: ReactNode
}

export function Topbar({ title, userName, onLogout, onMenuClick, extra }: TopbarProps) {
  return (
    <header className="flex h-14 min-h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 sm:h-[60px] sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick ? (
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] lg:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        ) : null}
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {extra}
        {userName ? (
          <span className="hidden max-w-[8rem] truncate text-sm text-[var(--color-text-muted)] sm:inline md:max-w-none">
            {userName}
          </span>
        ) : null}
        <Button variant="ghost" onClick={onLogout} type="button" className="min-h-10 px-2 sm:px-3">
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}
