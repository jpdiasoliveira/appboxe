import { useEffect, useState } from 'react'
import { PlanCard } from '../../components/PlanCard'
import { EMPTY_PLAN_FORM, PlanForm, planToForm, type PlanFormValues } from '../../components/PlanForm'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useAcademyContext } from '../../contexts/AcademyContext'
import type { AcademyPlanRow, PlanPriceHistoryRow } from '../../lib/academy-types'
import { formatPlanPrice, PLAN_KIND_LABELS, PLAN_PERIOD_LABELS } from '../../lib/plan-labels'
import {
  duplicateAcademyPlan,
  fetchAcademyPlans,
  fetchCategories,
  fetchPlanPriceHistory,
  upsertAcademyPlan,
} from './academy-api'

type EditStep = 'form' | 'confirm'

function buildUpsertPayload(form: PlanFormValues, planId?: string) {
  const isIndividual = form.planKind === 'INDIVIDUAL'
  return {
    id: planId,
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    price: Number(form.price),
    period: form.period,
    plan_kind: form.planKind,
    max_categories: isIndividual ? 1 : Number(form.maxCategories),
    is_public: form.isPublic,
    status: form.status,
    enrollment_fee: form.enrollmentFee ? Number(form.enrollmentFee) : null,
    trial_days: form.trialDays ? Number(form.trialDays) : null,
    first_class_free: form.firstClassFree,
    annual_discount_pct: form.annualDiscountPct ? Number(form.annualDiscountPct) : null,
    max_classes_per_week: form.maxClassesPerWeek ? Number(form.maxClassesPerWeek) : null,
    linked_category_ids: form.linkedCategoryIds,
    price_change_note: form.priceChangeNote.trim() || undefined,
  }
}

export function PlansPage() {
  const { activeAcademyId } = useAcademyContext()
  const [rows, setRows] = useState<AcademyPlanRow[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [priceHistoryByPlan, setPriceHistoryByPlan] = useState<Record<string, PlanPriceHistoryRow[]>>({})
  const [createForm, setCreateForm] = useState<PlanFormValues>(EMPTY_PLAN_FORM)
  const [editForm, setEditForm] = useState<PlanFormValues>(EMPTY_PLAN_FORM)
  const [editingPlan, setEditingPlan] = useState<AcademyPlanRow | null>(null)
  const [editStep, setEditStep] = useState<EditStep>('form')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function reload() {
    if (!activeAcademyId) return
    const plans = await fetchAcademyPlans(activeAcademyId)
    setRows(plans)
    const historyEntries = await Promise.all(
      plans.map(async (plan) => [plan.id, await fetchPlanPriceHistory(plan.id)] as const),
    )
    setPriceHistoryByPlan(Object.fromEntries(historyEntries))
  }

  useEffect(() => {
    if (!activeAcademyId) return
    reload().catch((e: Error) => setError(e.message))
    fetchCategories(activeAcademyId).then((rows) =>
      setCategories(rows.map((c) => ({ id: c.id, name: c.name }))),
    )
  }, [activeAcademyId])

  function openEdit(plan: AcademyPlanRow) {
    setEditingPlan(plan)
    setEditForm(planToForm(plan))
    setEditStep('form')
    setError(null)
  }

  function closeEdit() {
    setEditingPlan(null)
    setEditForm(EMPTY_PLAN_FORM)
    setEditStep('form')
    setError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId) return
    setSaving(true)
    setError(null)
    try {
      await upsertAcademyPlan(activeAcademyId, buildUpsertPayload(createForm))
      setCreateForm(EMPTY_PLAN_FORM)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  function handleEditFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditStep('confirm')
  }

  async function handleEditConfirm() {
    if (!activeAcademyId || !editingPlan) return
    setSaving(true)
    setError(null)
    try {
      await upsertAcademyPlan(activeAcademyId, buildUpsertPayload(editForm, editingPlan.id))
      closeEdit()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
      setEditStep('form')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicate(planId: string) {
    if (!activeAcademyId) return
    setError(null)
    try {
      await duplicateAcademyPlan(activeAcademyId, planId)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao duplicar')
    }
  }

  const priceChanged =
    editingPlan != null && Number(editForm.price) !== Number(editingPlan.price)

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Planos de mensalidade</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Campos opcionais — preço R$ 0, taxa zerada e descontos são permitidos. Nada bloqueia cortesia do professor.
      </p>

      {error && !editingPlan ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 lg:col-span-3">
          <h3 className="font-semibold">Novo plano</h3>
          <PlanForm
            form={createForm}
            setForm={setCreateForm}
            categories={categories}
            mode="create"
            saving={saving && !editingPlan}
            submitLabel="Criar plano"
            onSubmit={handleCreate}
          />
        </section>

        <aside className="space-y-4 lg:col-span-2 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
          <h3 className="font-semibold">
            Planos cadastrados
            {rows.length > 0 ? (
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                ({rows.length})
              </span>
            ) : null}
          </h3>
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhum plano ainda. Crie o primeiro ao lado.
            </p>
          ) : (
            rows.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                compact
                priceHistory={priceHistoryByPlan[plan.id] ?? []}
                onEdit={() => openEdit(plan)}
                onDuplicate={() => void handleDuplicate(plan.id)}
              />
            ))
          )}
        </aside>
      </div>

      <Modal
        open={editingPlan != null}
        onClose={closeEdit}
        title={editStep === 'form' ? 'Editar plano' : 'Confirmar alterações'}
      >
        {error && editingPlan ? (
          <FeedbackMessage variant="error" className="mb-4">
            {error}
          </FeedbackMessage>
        ) : null}

        {editStep === 'form' && editingPlan ? (
          <PlanForm
            form={editForm}
            setForm={setEditForm}
            categories={categories}
            mode="edit"
            saving={false}
            submitLabel="Continuar"
            onSubmit={handleEditFormSubmit}
            onCancel={closeEdit}
          />
        ) : null}

        {editStep === 'confirm' && editingPlan ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Revise as alterações antes de salvar. Alunos já matriculados não são alterados automaticamente.
            </p>

            <dl className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Nome</dt>
                <dd className="font-medium">{editForm.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Preço</dt>
                <dd className="font-medium">
                  {priceChanged ? (
                    <>
                      <span className="text-[var(--color-text-muted)] line-through">
                        {formatPlanPrice(Number(editingPlan.price))}
                      </span>
                      {' → '}
                      {formatPlanPrice(Number(editForm.price))}
                    </>
                  ) : (
                    formatPlanPrice(Number(editForm.price))
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Tipo</dt>
                <dd className="font-medium">{PLAN_KIND_LABELS[editForm.planKind]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Período</dt>
                <dd className="font-medium">{PLAN_PERIOD_LABELS[editForm.period]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Status</dt>
                <dd className="font-medium">{editForm.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--color-text-muted)]">Visibilidade</dt>
                <dd className="font-medium">
                  {editForm.isPublic ? 'Público (landing + portal)' : 'Interno'}
                </dd>
              </div>
              {priceChanged && editForm.priceChangeNote ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-text-muted)]">Nota</dt>
                  <dd className="text-right font-medium">{editForm.priceChangeNote}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void handleEditConfirm()} disabled={saving}>
                {saving ? 'Salvando…' : 'Confirmar alterações'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditStep('form')} disabled={saving}>
                Voltar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
