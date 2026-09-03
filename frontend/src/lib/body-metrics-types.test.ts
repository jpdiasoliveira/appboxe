import { describe, expect, it } from 'vitest'
import { shouldRecordBodyMetric } from './body-metrics-types'

describe('shouldRecordBodyMetric', () => {
  it('registra quando peso muda', () => {
    expect(shouldRecordBodyMetric({ weight_kg: 80 }, { weight_kg: 79.5, height_cm: 175 })).toBe(true)
  })

  it('não registra sem alteração', () => {
    expect(shouldRecordBodyMetric({ weight_kg: 80, height_cm: 175 }, { weight_kg: 80, height_cm: 175 })).toBe(
      false,
    )
  })

  it('não registra sem valores', () => {
    expect(shouldRecordBodyMetric({ weight_kg: 80 }, { weight_kg: null, height_cm: null })).toBe(false)
  })
})
