import { describe, expect, it } from 'vitest'
import { publicLandingPath, publicLandingUrl } from './landing-url'

describe('landing-url', () => {
  it('gera path MVP', () => {
    expect(publicLandingPath('academia-teste')).toBe('/a/academia-teste')
  })

  it('gera URL absoluta', () => {
    expect(publicLandingUrl('foo', 'https://ringpro.app')).toBe('https://ringpro.app/a/foo')
  })
})
