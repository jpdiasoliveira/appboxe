import type { InputHTMLAttributes } from 'react'
import { formatPhoneBR, formatPhoneInput } from '../../lib/phone-utils'
import { Input } from './Input'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder = '(11) 99999-9999',
  ...props
}: PhoneInputProps) {
  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      value={formatPhoneBR(value)}
      onChange={(e) => onChange(formatPhoneInput(e.target.value))}
    />
  )
}
