import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'

export type FeedbackVariant = 'success' | 'error' | 'warning' | 'info'

const variantStyles: Record<FeedbackVariant, { box: string; icon: string }> = {
  success: {
    box: 'border-green-500/30 bg-green-500/10 text-[var(--color-success)]',
    icon: 'text-[var(--color-success)]',
  },
  error: {
    box: 'border-red-500/30 bg-red-500/10 text-[var(--color-danger)]',
    icon: 'text-[var(--color-danger)]',
  },
  warning: {
    box: 'border-amber-500/30 bg-amber-500/10 text-[var(--color-warning)]',
    icon: 'text-[var(--color-warning)]',
  },
  info: {
    box: 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text)]',
    icon: 'text-[var(--color-text-muted)]',
  },
}

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
} as const

interface FeedbackMessageProps {
  variant?: FeedbackVariant
  children: ReactNode
  className?: string
}

export function FeedbackMessage({ variant = 'info', children, className = '' }: FeedbackMessageProps) {
  const Icon = icons[variant]
  const styles = variantStyles[variant]

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium ${styles.box} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
