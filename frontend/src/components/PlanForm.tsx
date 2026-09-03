import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import type { AcademyPlanRow, PlanKind, PlanPeriod } from '../lib/academy-types'
import { PLAN_KIND_LABELS, PLAN_PERIOD_LABELS } from '../lib/plan-labels'

const PERIODS: PlanPeriod[] = ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']

export interface PlanFormValues {
  name: string
  description: string
  price: string
  period: PlanPeriod
  planKind: PlanKind
  maxCategories: string
  isPublic: boolean
  status: string
  enrollmentFee: string
  trialDays: string
  firstClassFree: boolean
  annualDiscountPct: string
  maxClassesPerWeek: string
  linkedCategoryIds: string[]
  priceChangeNote: string
}

export const EMPTY_PLAN_FORM: PlanFormValues = {
  name: '',
  description: '',
  price: '',
  period: 'MENSAL',
  planKind: 'GROUP',
  maxCategories: '3',
  isPublic: true,
  status: 'ATIVO',
  enrollmentFee: '',
  trialDays: '',
  firstClassFree: false,
  annualDiscountPct: '',
  maxClassesPerWeek: '',
  linkedCategoryIds: [],
  priceChangeNote: '',
}

export function planToForm(plan: AcademyPlanRow): PlanFormValues {
  return {
    name: plan.name,
    description: plan.description ?? '',
    price: String(plan.price),
    period: plan.period,
    planKind: plan.plan_kind ?? 'GROUP',
    maxCategories: String(plan.max_categories),
    isPublic: plan.is_public,
    status: plan.status,
    enrollmentFee: plan.enrollment_fee != null ? String(plan.enrollment_fee) : '',
    trialDays: plan.trial_days != null ? String(plan.trial_days) : '',
    firstClassFree: plan.first_class_free ?? false,
    annualDiscountPct: plan.annual_discount_pct != null ? String(plan.annual_discount_pct) : '',
    maxClassesPerWeek: plan.max_classes_per_week != null ? String(plan.max_classes_per_week) : '',
    linkedCategoryIds: (plan.linked_categories ?? []).map((c) => c.id),
    priceChangeNote: '',
  }
}

interface PlanFormProps {
  form: PlanFormValues
  setForm: React.Dispatch<React.SetStateAction<PlanFormValues>>
  categories: { id: string; name: string }[]
  mode: 'create' | 'edit'
  saving?: boolean
  submitLabel: string
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
}

export function PlanForm({
  form,
  setForm,
  categories,
  mode,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
}: PlanFormProps) {
  const isIndividual = form.planKind === 'INDIVIDUAL'

  function toggleCategory(categoryId: string) {
    setForm((f) => ({
      ...f,
      linkedCategoryIds: f.linkedCategoryIds.includes(categoryId)
        ? f.linkedCategoryIds.filter((id) => id !== categoryId)
        : [...f.linkedCategoryIds, categoryId],
    }))
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor={`${mode}-plan-name`}>Nome</Label>
        <Input
          id={`${mode}-plan-name`}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor={`${mode}-plan-description`}>Descrição</Label>
        <Input
          id={`${mode}-plan-description`}
          placeholder="Aparece na landing e no portal do aluno"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-kind`}>Tipo</Label>
        <select
          id={`${mode}-plan-kind`}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
          value={form.planKind}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              planKind: e.target.value as PlanKind,
              maxCategories: e.target.value === 'INDIVIDUAL' ? '1' : f.maxCategories,
            }))
          }
        >
          {(Object.keys(PLAN_KIND_LABELS) as PlanKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {PLAN_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-period`}>Período</Label>
        <select
          id={`${mode}-plan-period`}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
          value={form.period}
          onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as PlanPeriod }))}
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {PLAN_PERIOD_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-price`}>Preço (R$)</Label>
        <Input
          id={`${mode}-plan-price`}
          type="number"
          step="0.01"
          min="0"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          required
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">Use 0 para gratuito ou cortesia.</p>
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-enrollment-fee`}>Taxa de matrícula (R$)</Label>
        <Input
          id={`${mode}-plan-enrollment-fee`}
          type="number"
          step="0.01"
          min="0"
          placeholder="Opcional — vazio = sem taxa"
          value={form.enrollmentFee}
          onChange={(e) => setForm((f) => ({ ...f, enrollmentFee: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-cats`}>Máx. modalidades</Label>
        <Input
          id={`${mode}-plan-cats`}
          type="number"
          min="1"
          value={isIndividual ? '1' : form.maxCategories}
          disabled={isIndividual}
          onChange={(e) => setForm((f) => ({ ...f, maxCategories: e.target.value }))}
        />
      </div>

      <div>
        <Label htmlFor={`${mode}-plan-trial`}>Trial (dias)</Label>
        <Input
          id={`${mode}-plan-trial`}
          type="number"
          min="0"
          placeholder="Opcional"
          value={form.trialDays}
          onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
        />
      </div>

      {form.period === 'ANUAL' ? (
        <div>
          <Label htmlFor={`${mode}-plan-annual-discount`}>Desconto anual (% ref.)</Label>
          <Input
            id={`${mode}-plan-annual-discount`}
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Opcional — só referência"
            value={form.annualDiscountPct}
            onChange={(e) => setForm((f) => ({ ...f, annualDiscountPct: e.target.value }))}
          />
        </div>
      ) : null}

      <div>
        <Label htmlFor={`${mode}-plan-weekly-limit`}>Limite aulas/semana</Label>
        <Input
          id={`${mode}-plan-weekly-limit`}
          type="number"
          min="1"
          placeholder="Opcional — referência"
          value={form.maxClassesPerWeek}
          onChange={(e) => setForm((f) => ({ ...f, maxClassesPerWeek: e.target.value }))}
        />
      </div>

      {mode === 'edit' ? (
        <div className="sm:col-span-2">
          <Label htmlFor={`${mode}-price-note`}>Nota da alteração de preço</Label>
          <Input
            id={`${mode}-price-note`}
            placeholder="Ex.: Reajuste anual, promoção de volta às aulas"
            value={form.priceChangeNote}
            onChange={(e) => setForm((f) => ({ ...f, priceChangeNote: e.target.value }))}
          />
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="sm:col-span-2">
          <Label>Modalidades vinculadas (opcional)</Label>
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Vazio = aluno escolhe livremente até o máximo. Marque para restringir a modalidades específicas.
          </p>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.linkedCategoryIds.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                />
                {cat.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.firstClassFree}
            onChange={(e) => setForm((f) => ({ ...f, firstClassFree: e.target.checked }))}
          />
          1ª aula grátis
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
          />
          Exibir na landing e portal do aluno
        </label>
      </div>

      {mode === 'edit' ? (
        <div>
          <Label htmlFor={`${mode}-plan-status`}>Status</Label>
          <select
            id={`${mode}-plan-status`}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
