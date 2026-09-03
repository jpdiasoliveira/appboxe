import { describe, expect, it } from 'vitest'
import {
  canAccessAcademyFinance,
  canCreateStudentInvite,
  canCreateTrainingCategory,
  canEditTrainingCategory,
  canManageAcademy,
  isOwnerOnlyAcademyPath,
  isScopedProfessor,
  pickAcademyRole,
} from './academy-permissions'
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

describe('academy-permissions', () => {
  it('professor não acessa financeiro', () => {
    expect(canAccessAcademyFinance([role({ role: 'PROFESSOR' })])).toBe(false)
  })

  it('professor pode gerar convite de aluno', () => {
    expect(canCreateStudentInvite([role({ role: 'PROFESSOR' })])).toBe(true)
  })

  it('assistant pode gerar convite de aluno', () => {
    expect(canCreateStudentInvite([role({ role: 'ASSISTANT' })])).toBe(true)
  })

  it('dono acessa gestão', () => {
    expect(canManageAcademy([role({ role: 'SCHOOL_OWNER' })])).toBe(true)
  })

  it('professor é escopo restrito', () => {
    expect(isScopedProfessor([role({ role: 'PROFESSOR' })])).toBe(true)
  })

  it('professor pode criar e editar turmas', () => {
    const professor = [role({ role: 'PROFESSOR' })]
    expect(canCreateTrainingCategory(professor)).toBe(true)
    expect(canEditTrainingCategory(professor)).toBe(true)
  })

  it('assistant não cria turmas', () => {
    const assistant = [role({ role: 'ASSISTANT' })]
    expect(canCreateTrainingCategory(assistant)).toBe(false)
    expect(canEditTrainingCategory(assistant)).toBe(false)
  })

  it('bloqueia rotas só do dono', () => {
    expect(isOwnerOnlyAcademyPath('/academy/financeiro')).toBe(true)
    expect(isOwnerOnlyAcademyPath('/academy/alunos')).toBe(false)
  })

  it('prioriza SCHOOL_OWNER quando dono também é professor', () => {
    const ownerAndProfessor = [
      role({ role: 'PROFESSOR' }),
      role({ role: 'SCHOOL_OWNER' }),
    ]
    expect(pickAcademyRole(ownerAndProfessor, 'a1')?.role).toBe('SCHOOL_OWNER')
    expect(isScopedProfessor([pickAcademyRole(ownerAndProfessor, 'a1')!])).toBe(false)
  })
})
