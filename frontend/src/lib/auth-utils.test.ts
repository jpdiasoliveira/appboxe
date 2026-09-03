import { describe, expect, it } from 'vitest'
import { canAccessFinanceiro, getRedirectForRole, pickPrimaryRole } from './auth-utils'
import type { UserAcademyRole } from './types'

function role(partial: Partial<UserAcademyRole> & { role: UserAcademyRole['role'] }): UserAcademyRole {
  return {
    id: '1',
    user_id: 'u1',
    academy_id: 'a1',
    status: 'ATIVO',
    ...partial,
  }
}

describe('pickPrimaryRole', () => {
  it('prioriza PLATFORM_OWNER', () => {
    const roles = [role({ role: 'STUDENT' }), role({ role: 'PLATFORM_OWNER' })]
    expect(pickPrimaryRole(roles)).toBe('PLATFORM_OWNER')
  })

  it('retorna null se vazio', () => {
    expect(pickPrimaryRole([])).toBeNull()
  })
})

describe('getRedirectForRole', () => {
  it('redireciona aluno para portal aluno', () => {
    expect(getRedirectForRole('STUDENT')).toBe('/student/dashboard')
  })
})

describe('canAccessFinanceiro', () => {
  it('nega ASSISTANT', () => {
    expect(canAccessFinanceiro([role({ role: 'ASSISTANT' })])).toBe(false)
  })

  it('nega PROFESSOR', () => {
    expect(canAccessFinanceiro([role({ role: 'PROFESSOR' })])).toBe(false)
  })

  it('permite SCHOOL_OWNER', () => {
    expect(canAccessFinanceiro([role({ role: 'SCHOOL_OWNER' })])).toBe(true)
  })
})
