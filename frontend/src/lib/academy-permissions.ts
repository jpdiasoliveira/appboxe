import type { UserAcademyRole, UserRole } from './types'
import { ROLE_PRIORITY } from './types'

/**
 * Regras do portal Academia:
 * - SCHOOL_OWNER = professor no dia a dia + gestão (financeiro, planos, config, equipe).
 * - PROFESSOR (sem owner) = operação nas modalidades vinculadas a ele.
 * - ASSISTANT = operação sem financeiro.
 *
 * Dono nunca cai no escopo restrito de professor — mesmo que também dê aula.
 */

function activeRoleOf(roles: UserAcademyRole[]): UserAcademyRole | null {
  return roles.find((r) => r.status === 'ATIVO') ?? null
}

/** Papel efetivo na academia — prioriza SCHOOL_OWNER sobre PROFESSOR. */
export function pickAcademyRole(
  roles: UserAcademyRole[],
  academyId: string,
): UserAcademyRole | null {
  const forAcademy = roles.filter(
    (r) => r.academy_id === academyId && r.status === 'ATIVO',
  )
  if (forAcademy.length === 0) return null

  for (const role of ROLE_PRIORITY) {
    const match = forAcademy.find((r) => r.role === role)
    if (match) return match
  }
  return forAcademy[0] ?? null
}

export function isSchoolOwnerRole(roles: UserAcademyRole[]): boolean {
  return roles.some((r) => r.status === 'ATIVO' && r.role === 'SCHOOL_OWNER')
}

/** Professor puro (não dono) — escopo por modalidade. */
export function isScopedProfessor(roles: UserAcademyRole[]): boolean {
  const active = activeRoleOf(roles)
  if (!active) return false
  return active.role === 'PROFESSOR'
}

/** Operação pedagógica: alunos, presença, agenda, categorias (leitura). */
export function canAccessTeachingOperations(role: UserRole | null): boolean {
  return role === 'SCHOOL_OWNER' || role === 'PROFESSOR' || role === 'ASSISTANT'
}

/** Financeiro da academia — somente dono (e plataforma). */
export function canAccessAcademyFinance(roles: UserAcademyRole[]): boolean {
  return roles.some(
    (r) =>
      r.status === 'ATIVO' &&
      (r.role === 'SCHOOL_OWNER' || r.role === 'PLATFORM_OWNER'),
  )
}

/** Gestão da academia: config, landing, planos, equipe, leads, convites pendentes. */
export function canManageAcademy(roles: UserAcademyRole[]): boolean {
  return isSchoolOwnerRole(roles) || roles.some((r) => r.status === 'ATIVO' && r.role === 'PLATFORM_OWNER')
}

/** Gerar link de matrícula — dono, professor e sub-professor. */
export function canCreateStudentInvite(roles: UserAcademyRole[]): boolean {
  return roles.some(
    (r) =>
      r.status === 'ATIVO' &&
      (r.role === 'SCHOOL_OWNER' ||
        r.role === 'PROFESSOR' ||
        r.role === 'ASSISTANT' ||
        r.role === 'PLATFORM_OWNER'),
  )
}

/** Criar modalidade/turma — dono ou professor (professor vê só as dele após criar). */
export function canCreateTrainingCategory(roles: UserAcademyRole[]): boolean {
  return canManageAcademy(roles) || isScopedProfessor(roles)
}

/** Editar modalidade — dono em qualquer turma; professor nas turmas vinculadas a ele. */
export function canEditTrainingCategory(roles: UserAcademyRole[]): boolean {
  return canManageAcademy(roles) || isScopedProfessor(roles)
}

const OWNER_ONLY_ROUTES = [
  '/academy/professores',
  '/academy/planos',
  '/academy/financeiro',
  '/academy/configuracoes',
  '/academy/filiais',
  '/academy/landing',
  '/academy/leads',
  '/academy/alunos/convites',
] as const

export function isOwnerOnlyAcademyPath(pathname: string): boolean {
  return OWNER_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function canAccessAcademyPath(pathname: string, role: UserRole | null): boolean {
  if (!role) return false
  if (role === 'SCHOOL_OWNER' || role === 'PLATFORM_OWNER') return true
  if (role === 'ASSISTANT') {
    return !isOwnerOnlyAcademyPath(pathname)
  }
  if (role === 'PROFESSOR') {
    return !isOwnerOnlyAcademyPath(pathname)
  }
  return false
}
