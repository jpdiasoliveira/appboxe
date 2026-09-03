import { supabase } from '../../lib/supabase'
import { DEFAULT_FEATURE_FLAGS } from '../../lib/platform-constants'
import type {
  AcademyRow,
  AuditLogRow,
  FeatureFlagRow,
  PlatformKpis,
  SaasInvoice,
  SaasPlan,
} from '../../lib/platform-types'
import type {
  PlatformFinanceReportFilters,
  PlatformFinanceReportRow,
} from '../../lib/platform-finance-report'

export async function fetchPlatformKpis(): Promise<PlatformKpis> {
  const { data, error } = await supabase.rpc('platform_network_stats')
  if (error) throw error

  const stats = data as {
    academias_ativas: number
    academias_inativas: number
    mrr_saas: number
    total_alunos: number
    alunos_ativos: number
    faturas_atrasadas: number
    faturas_pendentes?: number
    leads_mes: number
    churn_academias_30d?: number
    receita_recebida_mes?: number
  }

  return {
    academiasAtivas: stats.academias_ativas ?? 0,
    academiasInativas: stats.academias_inativas ?? 0,
    mrr: Number(stats.mrr_saas ?? 0),
    totalAlunos: stats.total_alunos ?? 0,
    alunosAtivos: stats.alunos_ativos ?? 0,
    inadimplencia: stats.faturas_atrasadas ?? 0,
    faturasPendentes: stats.faturas_pendentes ?? 0,
    churnAcademias30d: stats.churn_academias_30d ?? 0,
    receitaRecebidaMes: Number(stats.receita_recebida_mes ?? 0),
    leadsMes: stats.leads_mes ?? 0,
  }
}

export async function fetchAcademies(): Promise<AcademyRow[]> {
  const { data, error } = await supabase
    .from('academies')
    .select('*, saas_plans(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AcademyRow[]
}

export async function fetchSaasPlans(): Promise<SaasPlan[]> {
  const { data, error } = await supabase.from('saas_plans').select('*').order('price_monthly')
  if (error) throw error
  return (data ?? []) as SaasPlan[]
}

export async function createAcademyWithOwner(input: {
  name: string
  slug: string
  saasPlanId: string
  ownerEmail: string
  ownerName: string
}) {
  const { data, error } = await supabase.functions.invoke('create-academy-with-owner', {
    body: input,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { academyId: string }
}

export async function seedDefaultFlags(academyId: string) {
  const rows = DEFAULT_FEATURE_FLAGS.map((f: { key: string; defaultEnabled: boolean }) => ({
    academy_id: academyId,
    flag_key: f.key,
    enabled: f.defaultEnabled,
  }))
  const { error } = await supabase.from('academy_feature_flags').upsert(rows, {
    onConflict: 'academy_id,flag_key',
  })
  if (error) throw error
}

export async function fetchFeatureFlags(academyId: string): Promise<FeatureFlagRow[]> {
  const { data, error } = await supabase
    .from('academy_feature_flags')
    .select('*')
    .eq('academy_id', academyId)
  if (error) throw error
  return (data ?? []) as FeatureFlagRow[]
}

export async function updateFeatureFlag(academyId: string, flagKey: string, enabled: boolean) {
  const { error } = await supabase.from('academy_feature_flags').upsert(
    { academy_id: academyId, flag_key: flagKey, enabled },
    { onConflict: 'academy_id,flag_key' },
  )
  if (error) throw error
}

export async function fetchSaasInvoices(): Promise<SaasInvoice[]> {
  const { data, error } = await supabase
    .from('saas_invoices')
    .select('*, academy:academies(name, slug)')
    .order('due_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as SaasInvoice[]
}

export async function fetchSaasFinanceReport(
  filters: PlatformFinanceReportFilters,
): Promise<PlatformFinanceReportRow[]> {
  let query = supabase
    .from('saas_invoices')
    .select(
      'id, academy_id, amount, due_date, status, paid_at, academy:academies(name, slug, status, saas_plans(name, price_monthly))',
    )
    .gte('due_date', filters.fromDate)
    .lte('due_date', filters.toDate)
    .order('due_date', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => {
    const academy = row.academy as
      | {
          name: string
          slug: string
          status: string
          saas_plans: { name: string; price_monthly: number } | { name: string; price_monthly: number }[] | null
        }
      | {
          name: string
          slug: string
          status: string
          saas_plans: { name: string; price_monthly: number } | { name: string; price_monthly: number }[] | null
        }[]
      | null

    const academyRow = Array.isArray(academy) ? academy[0] : academy
    const plan = academyRow?.saas_plans
    const planRow = Array.isArray(plan) ? plan[0] : plan

    return {
      id: row.id as string,
      academyId: row.academy_id as string,
      academyName: academyRow?.name ?? '—',
      academySlug: academyRow?.slug ?? '—',
      academyStatus: academyRow?.status ?? '—',
      planName: planRow?.name ?? null,
      planMrr: planRow?.price_monthly != null ? Number(planRow.price_monthly) : null,
      amount: Number(row.amount),
      dueDate: row.due_date as string,
      status: row.status as PlatformFinanceReportRow['status'],
      paidAt: (row.paid_at as string | null) ?? null,
    }
  })
}

export async function createSaasInvoice(input: {
  academyId: string
  amount: number
  dueDate: string
}) {
  const { error } = await supabase.from('saas_invoices').insert({
    academy_id: input.academyId,
    amount: input.amount,
    due_date: input.dueDate,
    status: 'PENDENTE',
  })
  if (error) throw error
}

export async function markInvoicePaid(invoiceId: string) {
  const { error } = await supabase
    .from('saas_invoices')
    .update({ status: 'PAGO', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)
  if (error) throw error
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AuditLogRow[]
}

export async function upsertSaasPlan(plan: Partial<SaasPlan> & { name: string; price_monthly: number }) {
  if (plan.id) {
    const { error } = await supabase.from('saas_plans').update(plan).eq('id', plan.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('saas_plans').insert(plan)
    if (error) throw error
  }
}

export async function updateAcademyStatus(academyId: string, status: AcademyRow['status']) {
  const { error } = await supabase.from('academies').update({ status }).eq('id', academyId)
  if (error) throw error
}

export interface PlatformTeamMember {
  id: string
  user_id: string
  role: string
  status: string
  profiles?: { name: string } | { name: string }[] | null
}

export async function fetchPlatformTeam(): Promise<PlatformTeamMember[]> {
  const { data, error } = await supabase
    .from('user_academy_roles')
    .select('id, user_id, role, status, profiles(name)')
    .is('academy_id', null)
    .in('role', ['PLATFORM_OWNER', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE'])
    .eq('status', 'ATIVO')
    .order('role')
  if (error) throw error
  return (data ?? []) as PlatformTeamMember[]
}

export async function createPlatformStaffInvite(email: string, role: 'PLATFORM_SUPPORT' | 'PLATFORM_FINANCE') {
  const { data, error } = await supabase.functions.invoke('create-platform-staff-invite', {
    body: { email, role },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { token: string; expiresAt: string }
}
