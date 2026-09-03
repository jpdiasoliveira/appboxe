import type { LabelHTMLAttributes, ReactNode } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
}

export function Label({ children, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`mb-1.5 block text-[13px] font-medium text-[var(--color-text-muted)] ${className}`}
      {...props}
    >
      {children}
    </label>
  )
}
