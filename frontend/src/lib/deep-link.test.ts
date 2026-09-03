import { describe, expect, it } from 'vitest'
import { pathFromDeepLink } from './deep-link'

describe('pathFromDeepLink', () => {
  it('parseia ringpro://convite/:token', () => {
    expect(pathFromDeepLink('ringpro://convite/abc-123')).toBe('/convite/abc-123')
  })

  it('parseia https com path /convite/:token', () => {
    expect(pathFromDeepLink('https://app.ringpro.com/convite/xyz-456')).toBe('/convite/xyz-456')
  })

  it('preserva query string em URL https', () => {
    expect(pathFromDeepLink('https://app.ringpro.com/convite/tok?utm=wa')).toBe(
      '/convite/tok?utm=wa',
    )
  })

  it('retorna null para URLs não convite', () => {
    expect(pathFromDeepLink('https://app.ringpro.com/student/dashboard')).toBeNull()
    expect(pathFromDeepLink('ringpro://student/dashboard')).toBeNull()
    expect(pathFromDeepLink('not-a-url')).toBeNull()
  })

  it('retorna null para ringpro://convite sem token', () => {
    expect(pathFromDeepLink('ringpro://convite/')).toBeNull()
  })
})
