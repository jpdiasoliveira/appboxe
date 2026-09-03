export type UserRole =
  | 'PLATFORM_OWNER'
  | 'PLATFORM_SUPPORT'
  | 'PLATFORM_FINANCE'
  | 'SCHOOL_OWNER'
  | 'PROFESSOR'
  | 'ASSISTANT'
  | 'STUDENT'
export type AcademyStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO'

export type StudentStatus = 'ATIVO' | 'INATIVO' | 'INADIMPLENTE' | 'TRIAL'

export type InvoiceStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO'

export interface Profile {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  must_change_password: boolean
  created_at: string
  updated_at: string
}

export interface Academy {
  id: string
  name: string
  slug: string
  status: AcademyStatus
  saas_plan_id: string | null
  cnpj?: string | null
  billing_email?: string | null
  settings: Record<string, unknown>
  created_at: string
}

export interface UserAcademyRole {
  id: string
  user_id: string
  academy_id: string | null
  role: UserRole
  status: string
  academy?: Academy
}

export const ROLE_REDIRECT: Record<UserRole, string> = {
  PLATFORM_OWNER: '/platform/dashboard',
  PLATFORM_SUPPORT: '/platform/dashboard',
  PLATFORM_FINANCE: '/platform/dashboard',
  SCHOOL_OWNER: '/academy/dashboard',
  PROFESSOR: '/academy/dashboard',
  ASSISTANT: '/academy/dashboard',
  STUDENT: '/student/dashboard',
}

export const ROLE_PRIORITY: UserRole[] = [
  'PLATFORM_OWNER',
  'PLATFORM_SUPPORT',
  'PLATFORM_FINANCE',
  'SCHOOL_OWNER',
  'PROFESSOR',
  'ASSISTANT',
  'STUDENT',
]