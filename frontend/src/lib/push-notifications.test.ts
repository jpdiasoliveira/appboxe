import { describe, expect, it } from 'vitest'
import { pushPathForKind } from './push-notifications'

describe('pushPathForKind', () => {
  it('retorna path de convite', () => {
    expect(pushPathForKind('student_invite', 'abc-123')).toBe('/convite/abc-123')
  })

  it('retorna pagamento para lembretes de fatura', () => {
    expect(pushPathForKind('invoice_due_3d')).toBe('/student/pagamento')
    expect(pushPathForKind('invoice_due_today')).toBe('/student/pagamento')
  })

  it('retorna dashboard como fallback', () => {
    expect(pushPathForKind('unknown')).toBe('/student/dashboard')
  })
})
