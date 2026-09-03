import type { PlanPeriod, PlanKind } from './academy-types'

export const PLAN_PERIOD_LABELS: Record<PlanPeriod, string> = {
  MENSAL: 'Mensal',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
}

export const PLAN_KIND_LABELS: Record<PlanKind, string> = {
  GROUP: 'Grupo / turma',
  INDIVIDUAL: 'Individual',
}

export function formatPlanPrice(price: number): string {
  return Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
