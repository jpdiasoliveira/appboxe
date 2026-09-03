import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useStudentContext } from '../../contexts/StudentContext'
import type { AcademyPlanPublic } from '../../lib/student-types'
import { createPendingInvoice, fetchPublicPlans, fetchStudentDashboard, selectPlan } from './student-api'

export function MyPlanPage() {
  const { student, refresh } = useStudentContext()
  const [plans, setPlans] = useState<AcademyPlanPublic[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!student) return
    fetchPublicPlans(student.academy_id).then(setPlans)
    fetchStudentDashboard(student.id).then((d) => {
      setCurrentPlanId(d.subscription?.academy_plan_id ?? null)
    })
  }, [student])

  async function handleSelect(planId: string) {
    if (!student) return
    setLoading(true)
    setMessage(null)
    try {
      await selectPlan(student.id, planId)
      const plan = plans.find((p) => p.id === planId)
      if (plan) {
        await createPendingInvoice(student.id)
      }
      setCurrentPlanId(planId)
      setMessage('Plano atualizado. A próxima cobrança refletirá o novo valor.')
      await refresh()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Meu plano</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        A troca de plano vale a partir do próximo ciclo de cobrança.
      </p>
      {message ? <p className="mb-4 text-sm text-[var(--color-text-muted)]">{message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-xl border p-4 ${
              currentPlanId === plan.id
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)]'
            }`}
          >
            <h3 className="font-semibold">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold text-[var(--color-primary)]">
              {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {plan.period} · até {plan.max_categories} modalidades
            </p>
            {currentPlanId !== plan.id ? (
              <Button className="mt-4" disabled={loading} onClick={() => handleSelect(plan.id)}>
                Escolher
              </Button>
            ) : (
              <p className="mt-4 text-sm font-medium text-[var(--color-success)]">Plano atual</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
