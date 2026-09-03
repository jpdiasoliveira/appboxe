import type { UserRole } from './types'
import { ROLE_PRIORITY, ROLE_REDIRECT } from './types'
import type { UserAcademyRole } from './types'

export function pickPrimaryRole(roles: UserAcademyRole[]): UserRole | null {
  if (roles.length === 0) return null
  for (const role of ROLE_PRIORITY) {
    if (roles.some((r) => r.role === role && r.status === 'ATIVO')) {
      return role
    }
  }
  return roles[0]?.role ?? null
}

export function getRedirectForRole(role: UserRole): string {
  return ROLE_REDIRECT[role]
}

export function hasRole(roles: UserAcademyRole[], role: UserRole): boolean {
  return roles.some((r) => r.role === role && r.status === 'ATIVO')
}

export function canAccessFinanceiro(roles: UserAcademyRole[]): boolean {
  return roles.some(
    (r) =>
      r.status === 'ATIVO' &&
      (r.role === 'SCHOOL_OWNER' ||
        r.role === 'PLATFORM_OWNER' ||
        r.role === 'PLATFORM_FINANCE'),
  )
}

export function isPlatformOperator(roles: UserAcademyRole[]): boolean {
  return roles.some(
    (r) =>
      r.status === 'ATIVO' &&
      (r.role === 'PLATFORM_OWNER' ||
        r.role === 'PLATFORM_SUPPORT' ||
        r.role === 'PLATFORM_FINANCE'),
  )
}
