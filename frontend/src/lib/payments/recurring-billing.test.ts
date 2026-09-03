import { describe, expect, it } from 'vitest'
import {
  buildRecurringIdempotencyKey,
  MAX_CARD_CHARGE_ATTEMPTS,
  nextRetryDateAfterFailure,
  shouldAttemptChargeToday,
} from './recurring-billing'

describe('nextRetryDateAfterFailure', () => {
  it('agenda D+1, D+3 e D+7', () => {
    expect(nextRetryDateAfterFailure('2026-09-01', 1)).toBe('2026-09-02')
    expect(nextRetryDateAfterFailure('2026-09-01', 2)).toBe('2026-09-04')
    expect(nextRetryDateAfterFailure('2026-09-01', 3)).toBe('2026-09-08')
    expect(nextRetryDateAfterFailure('2026-09-01', 4)).toBeNull()
  })
})

describe('shouldAttemptChargeToday', () => {
  it('primeira tentativa no vencimento', () => {
    expect(shouldAttemptChargeToday('2026-09-01', 0, null, '2026-09-01')).toBe(true)
    expect(shouldAttemptChargeToday('2026-09-05', 0, null, '2026-09-01')).toBe(false)
  })

  it('retries respeitam data agendada', () => {
    expect(shouldAttemptChargeToday('2026-09-01', 1, '2026-09-02', '2026-09-02')).toBe(true)
    expect(shouldAttemptChargeToday('2026-09-01', 1, '2026-09-02', '2026-09-01')).toBe(false)
  })

  it('para após limite de tentativas', () => {
    expect(shouldAttemptChargeToday('2026-09-01', MAX_CARD_CHARGE_ATTEMPTS, null, '2026-09-10')).toBe(
      false,
    )
  })
})

describe('buildRecurringIdempotencyKey', () => {
  it('inclui invoice e tentativa', () => {
    expect(buildRecurringIdempotencyKey('inv-1', 2)).toBe('recurring:card:inv-1:2')
  })
})
