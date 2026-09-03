import { describe, expect, it } from 'vitest'
import { formatDateBR } from './date-utils'

describe('formatDateBR', () => {
  it('formata YYYY-MM-DD para dd/mm/aaaa', () => {
    expect(formatDateBR('2026-09-02')).toBe('02/09/2026')
    expect(formatDateBR('2026-08-10')).toBe('10/08/2026')
  })

  it('retorna fallback para vazio', () => {
    expect(formatDateBR(null)).toBe('—')
    expect(formatDateBR('')).toBe('—')
  })
})
