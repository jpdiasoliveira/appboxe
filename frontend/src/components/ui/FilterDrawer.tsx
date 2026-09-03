import { useEffect, type ReactNode } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { Button } from './Button'

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  onClear: () => void
  onApply: () => void
  applyLabel?: string
}

export function FilterDrawer({
  open,
  onClose,
  title = 'Filtros',
  children,
  onClear,
  onApply,
  applyLabel = 'Aplicar',
}: FilterDrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar filtros"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <h3 id="filter-drawer-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
            onClick={onClose}
            aria-label="Fechar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--color-border)] px-5 py-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClear}>
            Limpar
          </Button>
          <Button type="button" className="flex-1" onClick={onApply}>
            {applyLabel}
          </Button>
        </div>
      </aside>
    </div>
  )
}
