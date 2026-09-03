import { describe, expect, it } from 'vitest'
import {
  parseTrialConfig,
  resolveInitialStudentEnrollment,
} from './trial-policy'

describe('parseTrialConfig', () => {
  it('default OFF', () => {
    expect(parseTrialConfig({})).toEqual({ trial_mode: 'OFF', trial_days: 7 })
  })

  it('lê modo e dias', () => {
    expect(parseTrialConfig({ trial_mode: 'DAYS', trial_days: 14 })).toEqual({
      trial_mode: 'DAYS',
      trial_days: 14,
    })
  })
})

describe('resolveInitialStudentEnrollment', () => {
  const now = new Date('2026-09-02T12:00:00.000Z')

  it('OFF → ATIVO', () => {
    expect(
      resolveInitialStudentEnrollment({ trial_mode: 'OFF', trial_days: 7 }, null, now),
    ).toEqual({ status: 'ATIVO', trial_ends_at: null })
  })

  it('DAYS → TRIAL com trial_ends_at', () => {
    const result = resolveInitialStudentEnrollment(
      { trial_mode: 'DAYS', trial_days: 7 },
      null,
      now,
    )
    expect(result.status).toBe('TRIAL')
    expect(result.trial_ends_at).toBe('2026-09-09T12:00:00.000Z')
  })

  it('MANUAL respeita escolha', () => {
    expect(
      resolveInitialStudentEnrollment({ trial_mode: 'MANUAL', trial_days: 7 }, 'TRIAL', now),
    ).toEqual({ status: 'TRIAL', trial_ends_at: null })
  })
})
