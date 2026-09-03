import { useState, type ReactNode } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface CollapsibleSectionProps {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/40">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0">
          <span className="text-sm font-semibold">{title}</span>
          {description ? (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
          ) : null}
        </div>
        <ChevronDownIcon
          className={`mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-[var(--color-border)] px-4 py-4">{children}</div> : null}
    </section>
  )
}
