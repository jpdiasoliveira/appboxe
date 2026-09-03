import { useState } from 'react'
import {
  PencilSquareIcon,
  UserGroupIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import type { AcademyPlanRow, PlanPriceHistoryRow } from '../lib/academy-types'
import { formatPlanPrice, PLAN_KIND_LABELS, PLAN_PERIOD_LABELS } from '../lib/plan-labels'

interface PlanCardProps {
  plan: AcademyPlanRow
  priceHistory?: PlanPriceHistoryRow[]
  compact?: boolean
  onEdit: () => void
  onDuplicate: () => void
}

export function PlanCard({ plan, priceHistory = [], compact, onEdit, onDuplicate }: PlanCardProps) {
  const [showHistory, setShowHistory] = useState(false)
  const isIndividual = plan.plan_kind === 'INDIVIDUAL'
  const isFree = Number(plan.price) === 0

  return (
    <article
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{plan.name}</h3>
            <Badge variant={isIndividual ? 'warning' : 'muted'}>
              {PLAN_KIND_LABELS[plan.plan_kind ?? 'GROUP']}
            </Badge>
            {isFree ? <Badge variant="success">Gratuito</Badge> : null}
            {plan.first_class_free ? <Badge variant="success">1ª aula grátis</Badge> : null}
            {plan.trial_days ? <Badge variant="warning">{`${plan.trial_days}d trial`}</Badge> : null}
            {plan.is_public ? <Badge variant="success">Público</Badge> : <Badge variant="muted">Interno</Badge>}
            {plan.status !== 'ATIVO' ? <Badge variant="danger">Inativo</Badge> : null}
          </div>
          {plan.description ? (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{plan.description}</p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" onClick={onDuplicate} title="Duplicar plano">
            <DocumentDuplicateIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onEdit}
            title="Editar plano"
            className={compact ? 'px-2 py-1.5 text-xs' : ''}
          >
            <PencilSquareIcon className={compact ? 'h-4 w-4' : 'mr-1.5 h-4 w-4'} />
            {!compact ? 'Editar' : null}
          </Button>
        </div>
      </div>

      <div className={`mt-3 grid gap-2 text-sm ${compact ? 'grid-cols-2' : 'gap-3 sm:grid-cols-2 lg:grid-cols-4'}`}>
        <div>
          <p className="text-xs uppercase text-[var(--color-text-muted)]">Preço</p>
          <p className="font-medium">{formatPlanPrice(plan.price)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-[var(--color-text-muted)]">Período</p>
          <p className="font-medium">
            {PLAN_PERIOD_LABELS[plan.period]}
            {plan.period === 'ANUAL' && plan.annual_discount_pct
              ? ` · ref. ${plan.annual_discount_pct}% off`
              : null}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-[var(--color-text-muted)]">Modalidades</p>
          <p className="font-medium">
            {plan.linked_categories && plan.linked_categories.length > 0
              ? plan.linked_categories.map((c) => c.name).join(', ')
              : isIndividual
                ? '1 (individual)'
                : `Até ${plan.max_categories} (livre)`}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-[var(--color-text-muted)]">Alunos ativos</p>
          <p className="inline-flex items-center gap-1 font-medium">
            <UserGroupIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
            {plan.active_subscribers ?? 0}
          </p>
        </div>
      </div>

      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
          {plan.enrollment_fee != null && Number(plan.enrollment_fee) > 0 ? (
            <span>Taxa matrícula: {formatPlanPrice(Number(plan.enrollment_fee))}</span>
          ) : (
            <span>Sem taxa de matrícula</span>
          )}
          {plan.max_classes_per_week ? (
            <span>Até {plan.max_classes_per_week} aulas/semana (referência)</span>
          ) : null}
          {plan.is_public ? (
            <span className="inline-flex items-center gap-1">
              <GlobeAltIcon className="h-3.5 w-3.5" />
              Na landing e portal do aluno
            </span>
          ) : null}
        </div>
      ) : null}

      {!compact && priceHistory.length > 0 ? (
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-medium"
            onClick={() => setShowHistory((v) => !v)}
          >
            Histórico de preço
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </button>
          {showHistory ? (
            <ul className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
              {priceHistory.map((row) => (
                <li key={row.id} className="flex justify-between gap-2">
                  <span>
                    {formatPlanPrice(Number(row.price))}
                    {row.note ? ` — ${row.note}` : ''}
                  </span>
                  <span>{new Date(row.created_at).toLocaleDateString('pt-BR')}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
