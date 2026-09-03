import { useEffect, useId, useRef, useState, type ComponentType, type SVGProps } from 'react'
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline'

export interface RowActionItem {
  id: string
  label: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface RowActionsMenuProps {
  items: RowActionItem[]
  ariaLabel?: string
}

export function RowActionsMenu({ items, ariaLabel = 'Ações' }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (items.length === 0) {
    return <span className="text-xs text-[var(--color-text-muted)]">—</span>
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text)]"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[11rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] py-1 shadow-lg"
        >
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.danger ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'
                }`}
                onClick={() => {
                  if (item.disabled) return
                  setOpen(false)
                  item.onClick()
                }}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
