import type { SelectHTMLAttributes } from 'react'
import { fieldClassName } from './field-class'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
}

export function Select({ error, className = '', children, ...props }: SelectProps) {
  return (
    <div>
      <select className={`${fieldClassName} ${className}`} {...props}>
        {children}
      </select>
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  )
}
