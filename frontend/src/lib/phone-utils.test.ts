import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
  formatPhoneBR,
  formatPhoneDisplay,
  normalizePhoneForStorage,
} from './phone-utils'

describe('phone-utils', () => {
  it('formata celular 11 dígitos', () => {
    expect(formatPhoneBR('47996245371')).toBe('(47) 99624-5371')
  })

  it('formata fixo 10 dígitos', () => {
    expect(formatPhoneBR('1199001300')).toBe('(11) 9900-1300')
  })

  it('mantém valor já mascarado', () => {
    expect(formatPhoneBR('(11) 9900-1300')).toBe('(11) 9900-1300')
  })

  it('normaliza para storage', () => {
    expect(normalizePhoneForStorage('47996245371')).toBe('(47) 99624-5371')
    expect(normalizePhoneForStorage('')).toBeNull()
    expect(normalizePhoneForStorage(null)).toBeNull()
  })

  it('digitsOnly remove não numéricos', () => {
    expect(digitsOnly('(47) 99624-5371')).toBe('47996245371')
  })

  it('formatPhoneDisplay com fallback', () => {
    expect(formatPhoneDisplay('47996245371')).toBe('(47) 99624-5371')
    expect(formatPhoneDisplay(null)).toBe('—')
  })
})
