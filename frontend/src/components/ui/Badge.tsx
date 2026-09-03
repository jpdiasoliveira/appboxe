type BadgeVariant = 'success' | 'danger' | 'warning' | 'muted'

const styles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/15 text-[var(--color-success)]',
  danger: 'bg-red-500/15 text-[var(--color-danger)]',
  warning: 'bg-amber-500/15 text-[var(--color-warning)]',
  muted: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: string
}

export function Badge({ variant = 'muted', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[variant]}`}
    >
      {children}
    </span>
  )
}
