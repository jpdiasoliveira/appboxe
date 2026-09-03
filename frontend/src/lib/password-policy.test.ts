import { describe, expect, it } from 'vitest'
import {
  MIN_PASSWORD_LENGTH,
  isPasswordLongEnough,
  validatePasswordPair,
} from './password-policy'

describe('password-policy', () => {
  it('exige no mínimo 6 caracteres', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(6)
    expect(isPasswordLongEnough('12345')).toBe(false)
    expect(isPasswordLongEnough('123456')).toBe(true)
  })

  it('valida par de senhas', () => {
    expect(validatePasswordPair('12345', '12345')).toContain('6 caracteres')
    expect(validatePasswordPair('123456', '654321')).toContain('não conferem')
    expect(validatePasswordPair('123456', '123456')).toBeNull()
  })
})
