/** Atalhos de login — apenas desenvolvimento local (não incluir em build de produção). */

export const DEV_PASSWORD = 'RingPro@dev123'

export interface DevUserShortcut {
  key: string
  label: string
  hint: string
  email: string
  defaultPath: string
}

export const DEV_USER_SHORTCUTS: DevUserShortcut[] = [
  {
    key: 'professor',
    label: 'Professor',
    hint: 'Agenda, alunos, presença',
    email: 'professor@academia-teste.dev',
    defaultPath: '/academy/agenda',
  },
  {
    key: 'owner',
    label: 'Dono academia',
    hint: 'Financeiro + configurações',
    email: 'owner@academia-teste.dev',
    defaultPath: '/academy/dashboard',
  },
  {
    key: 'assistant',
    label: 'Sub-professor',
    hint: 'Sem financeiro',
    email: 'assistant@academia-teste.dev',
    defaultPath: '/academy/dashboard',
  },
  {
    key: 'student',
    label: 'Aluno',
    hint: 'Portal + agenda pessoal',
    email: 'aluno@academia-teste.dev',
    defaultPath: '/student/agenda',
  },
  {
    key: 'platform',
    label: 'Plataforma SaaS',
    hint: 'Admin global',
    email: 'platform@ringpro.dev',
    defaultPath: '/platform/dashboard',
  },
]

export function findDevUser(key: string): DevUserShortcut | undefined {
  return DEV_USER_SHORTCUTS.find((u) => u.key === key)
}
