import { describe, expect, it } from 'vitest'
import { formatBodyAssessmentDueMessage } from './body-assessment-types'

describe('formatBodyAssessmentDueMessage', () => {
  it('retorna null quando módulo desligado', () => {
    expect(formatBodyAssessmentDueMessage({ enabled: false })).toBeNull()
  })

  it('retorna null quando não está vencido', () => {
    expect(
      formatBodyAssessmentDueMessage({
        enabled: true,
        is_due: false,
        due_on: '2026-12-01',
      }),
    ).toBeNull()
  })

  it('formata mensagem quando vencido', () => {
    expect(
      formatBodyAssessmentDueMessage({
        enabled: true,
        is_due: true,
        due_on: '2026-03-01',
      }),
    ).toBe('Avaliação física pendente desde 01/03/2026. Atualize peso e altura.')
  })
})
