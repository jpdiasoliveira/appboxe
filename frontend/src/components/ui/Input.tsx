import type { InputHTMLAttributes } from 'react'
import { fieldClassNameLg } from './field-class'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export function Input({ error, className = '', type, ...props }: InputProps) {
  const isPicker = type === 'date' || type === 'time' || type === 'datetime-local'

  return (
    <div>
      <input
        type={type}
        className={`${fieldClassNameLg} ${isPicker ? '[color-scheme:dark]' : ''} ${className}`}
        {...props}
      />
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  )
}
