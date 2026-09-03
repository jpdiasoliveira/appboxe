import type { InvoiceStatus } from './types'

export interface SaasPlan {
  id: string
  name: string
  price_monthly: number
  max_students: number
  features: Record<string, unknown>
  status: string
}

export interface AcademyRow {
  id: string
  name: string
  slug: string
  status: import('./types').AcademyStatus
  saas_plan_id: string | null
  cnpj?: string | null
  billing_email?: string | null
  created_at: string
  saas_plan?: SaasPlan | null
  saas_plans?: SaasPlan | SaasPlan[] | null
}

export interface SaasInvoice {
  id: string
  academy_id: string
  amount: number
  due_date: string
  status: InvoiceStatus
  paid_at: string | null
  academy?: { name: string; slug: string }
}

export interface FeatureFlagRow {
  id: string
  academy_id: string
  flag_key: string
  enabled: boolean
}

export interface AuditLogRow {
  id: string
  user_id: string | null
  academy_id: string | null
  action: string
  entity_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface PlatformKpis {
  academiasAtivas: number
  academiasInativas: number
  mrr: number
  totalAlunos: number
  alunosAtivos: number
  inadimplencia: number
  faturasPendentes: number
  churnAcademias30d: number
  receitaRecebidaMes: number
  leadsMes: number
}
