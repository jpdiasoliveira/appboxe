import { describe, expect, it } from 'vitest'
import { needsAcademyOnboarding, parseAcademySettings } from './academy-settings'

describe('academy-settings onboarding', () => {
  it('exige onboarding apenas quando flag é false', () => {
    expect(needsAcademyOnboarding(parseAcademySettings({}))).toBe(false)
    expect(needsAcademyOnboarding(parseAcademySettings({ onboarding_completed: true }))).toBe(false)
    expect(needsAcademyOnboarding(parseAcademySettings({ onboarding_completed: false }))).toBe(true)
  })
})
