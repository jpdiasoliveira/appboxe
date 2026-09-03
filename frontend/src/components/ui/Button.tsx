import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
  fullWidth?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white border-none',
  ghost:
    'bg-transparent text-[var(--color-text-muted)] border border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]',
  danger: 'bg-[var(--color-danger)] text-white border-none',
}

export function Button({
  variant = 'primary',
  children,
  fullWidth,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
