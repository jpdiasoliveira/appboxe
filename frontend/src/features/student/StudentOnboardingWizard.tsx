import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { Label } from '../../components/ui/Label'
import { useAuth } from '../../contexts/AuthContext'
import { useStudentContext } from '../../contexts/StudentContext'
import { formatPhoneBR } from '../../lib/phone-utils'
import type { AcademyPlanPublic, StudentInvoice } from '../../lib/student-types'
import { isPaymentsMock } from '../../lib/payments'
import type { ChargeResult } from '../../lib/payments/types'
import { PaymentChargePanel } from './components/PaymentChargePanel'
import {
  completeStudentOnboarding,
  createPendingInvoice,
  createPaymentCharge,
  fetchAllCategories,
  fetchPaymentMethods,
  fetchPublicPlans,
  fetchStudentDashboard,
  savePaymentMethod,
  selectPlan,
  setStudentCategories,
  simulatePayment,
  updateStudentProfile,
} from './student-api'

const STEPS = ['Perfil', 'Plano', 'Modalidades', 'Pagamento'] as const
type Step = (typeof STEPS)[number]

const IS_DEV = import.meta.env.DEV
const PAYMENTS_MOCK = isPaymentsMock()

export function StudentOnboardingWizard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { student, refresh } = useStudentContext()

  const [step, setStep] = useState<Step>('Perfil')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  const [plans, setPlans] = useState<AcademyPlanPublic[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const [categories, setCategories] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [maxCategories, setMaxCategories] = useState(1)

  const [invoice, setInvoice] = useState<StudentInvoice | null>(null)
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)
  const [cardLast4, setCardLast4] = useState('')
  const [paymentCharge, setPaymentCharge] = useState<ChargeResult | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  useEffect(() => {
    if (!student) return
    setPhone(formatPhoneBR(student.phone ?? ''))
    setBirthDate(student.birth_date ?? '')
    setWeightKg(student.weight_kg != null ? String(student.weight_kg) : '')
    setHeightCm(student.height_cm != null ? String(student.height_cm) : '')
    setEmergencyName(student.emergency_contact_name ?? '')
    setEmergencyPhone(formatPhoneBR(student.emergency_contact_phone ?? ''))

    void fetchPublicPlans(student.academy_id).then(setPlans)
    setCategoriesLoading(true)
    setCategoriesError(null)
    void fetchAllCategories(student.academy_id)
      .then((data) => setCategories(data))
      .catch((e) =>
        setCategoriesError(e instanceof Error ? e.message : 'Não foi possível carregar as modalidades'),
      )
      .finally(() => setCategoriesLoading(false))
    void fetchStudentDashboard(student.id).then((d) => {
      setSelectedPlanId(d.subscription?.academy_plan_id ?? null)
      setSelectedCategories(new Set(d.categories.map((c) => c.id)))
      setMaxCategories(d.subscription?.plan?.max_categories ?? 1)
      setInvoice(d.pendingInvoice)
    })
    void fetchPaymentMethods(student.id).then((methods) => setHasPaymentMethod(methods.length > 0))
  }, [student])

  useEffect(() => {
    const plan = plans.find((p) => p.id === selectedPlanId)
    if (plan) setMaxCategories(plan.max_categories)
  }, [selectedPlanId, plans])

  if (!student) {
    return <p className="text-[var(--color-danger)]">Perfil de aluno não encontrado.</p>
  }

  const studentId = student.id

  async function saveProfile() {
    setLoading(true)
    setError(null)
    try {
      await updateStudentProfile(studentId, {
        phone: phone || undefined,
        birth_date: birthDate || null,
        weight_kg: weightKg ? Number(weightKg) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
      })
      await refresh()
      setStep('Plano')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  async function savePlan() {
    if (!selectedPlanId) {
      setError('Escolha um plano para continuar.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await selectPlan(studentId, selectedPlanId)
      const plan = plans.find((p) => p.id === selectedPlanId)
      if (plan) {
        const dashboard = await fetchStudentDashboard(studentId)
        if (!dashboard.pendingInvoice) {
          await createPendingInvoice(studentId)
        }
      }
      const d = await fetchStudentDashboard(studentId)
      setInvoice(d.pendingInvoice)
      setMaxCategories(d.subscription?.plan?.max_categories ?? plan?.max_categories ?? 1)
      setStep('Modalidades')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar plano')
    } finally {
      setLoading(false)
    }
  }

  async function saveModalities() {
    if (selectedCategories.size === 0) {
      setError('Selecione pelo menos uma modalidade.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await setStudentCategories(studentId, [...selectedCategories])
      setStep('Pagamento')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar modalidades')
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxCategories) next.add(id)
      return next
    })
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (cardLast4.length !== 4) return
    setLoading(true)
    setPaymentMessage(null)
    try {
      await savePaymentMethod(studentId, { lastFour: cardLast4 })
      setHasPaymentMethod(true)
      setCardLast4('')
      setPaymentMessage('Cartão salvo com sucesso.')
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : 'Erro ao salvar cartão')
    } finally {
      setLoading(false)
    }
  }

  async function handlePix() {
    if (!invoice) return
    setLoading(true)
    setPaymentCharge(null)
    try {
      const res = await createPaymentCharge(invoice.id, 'PIX')
      setPaymentCharge(res)
      setPaymentMessage(res.message)
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : 'Erro ao gerar PIX')
    } finally {
      setLoading(false)
    }
  }

  async function handleBoleto() {
    if (!invoice) return
    setLoading(true)
    setPaymentCharge(null)
    try {
      const res = await createPaymentCharge(invoice.id, 'BOLETO')
      setPaymentCharge(res)
      setPaymentMessage(res.message)
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : 'Erro ao gerar boleto')
    } finally {
      setLoading(false)
    }
  }

  async function handleSimulate() {
    if (!invoice) return
    setLoading(true)
    try {
      await simulatePayment(invoice.id)
      setPaymentMessage('Pagamento confirmado!')
      setInvoice(null)
      await refresh()
    } catch (e) {
      setPaymentMessage(e instanceof Error ? e.message : 'Erro ao simular')
    } finally {
      setLoading(false)
    }
  }

  async function finishOnboarding() {
    setLoading(true)
    setError(null)
    try {
      await completeStudentOnboarding(studentId)
      await refresh()
      navigate('/student/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao concluir')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[var(--color-primary)]">
        Bem-vindo{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Configure sua conta</h1>
      {student.academy?.name ? (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">{student.academy.name}</p>
      ) : (
        <div className="mb-6" />
      )}

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>
            Passo {stepIndex + 1} de {STEPS.length}
          </span>
          <span>{step}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                i === stepIndex
                  ? 'bg-[var(--color-primary)] text-white'
                  : i < stepIndex
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p> : null}

      {step === 'Perfil' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void saveProfile()
          }}
          className="space-y-4"
        >
          <p className="text-sm text-[var(--color-text-muted)]">
            Confirme ou complete seus dados. Você pode ajustar depois em Meu perfil.
          </p>
          <div>
            <Label htmlFor="ob-phone">Telefone / WhatsApp</Label>
            <PhoneInput id="ob-phone" value={phone} onChange={setPhone} />
          </div>
          <div>
            <Label htmlFor="ob-birth">Data de nascimento</Label>
            <Input
              id="ob-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ob-weight">Peso (kg)</Label>
              <Input
                id="ob-weight"
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ob-height">Altura (cm)</Label>
              <Input
                id="ob-height"
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ob-em-name">Contato de emergência</Label>
            <Input
              id="ob-em-name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ob-em-phone">Tel. emergência</Label>
            <PhoneInput id="ob-em-phone" value={emergencyPhone} onChange={setEmergencyPhone} />
          </div>
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Salvando...' : 'Continuar'}
          </Button>
        </form>
      ) : null}

      {step === 'Plano' ? (
        <div>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Escolha o plano de mensalidade da academia.
          </p>
          <div className="mb-6 space-y-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selectedPlanId === plan.id
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'
                }`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <p className="font-semibold">{plan.name}</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">
                  {Number(plan.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {plan.period} · até {plan.max_categories} modalidades
                </p>
              </button>
            ))}
            {plans.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                Nenhum plano público disponível. Fale com a recepção.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('Perfil')}>
              Voltar
            </Button>
            <Button type="button" disabled={loading || !selectedPlanId} onClick={() => void savePlan()}>
              {loading ? 'Salvando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'Modalidades' ? (
        <div>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Escolha até {maxCategories} modalidade(s).
          </p>
          {categoriesLoading ? (
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">Carregando modalidades...</p>
          ) : categoriesError ? (
            <p className="mb-6 text-sm text-[var(--color-danger)]">{categoriesError}</p>
          ) : categories.length === 0 ? (
            <p className="mb-6 text-sm text-[var(--color-text-muted)]">
              Nenhuma modalidade disponível no momento. Fale com a recepção da academia.
            </p>
          ) : (
            <ul className="mb-6 space-y-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(c.id)}
                      onChange={() => toggleCategory(c.id)}
                    />
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color ?? '#B91C1C' }}
                    />
                    <span>{c.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('Plano')}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={loading || categoriesLoading || selectedCategories.size === 0 || categories.length === 0}
              onClick={() => void saveModalities()}
            >
              {loading ? 'Salvando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'Pagamento' ? (
        <div>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Cadastre uma forma de pagamento ou pague a primeira mensalidade. Você pode concluir depois no
            painel.
          </p>

          {invoice ? (
            <div className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
              <p className="font-medium">Primeira mensalidade</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {Number(invoice.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">Vencimento: {invoice.due_date}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" disabled={loading} onClick={() => void handlePix()}>
                  Gerar PIX
                </Button>
                <Button type="button" variant="ghost" disabled={loading} onClick={() => void handleBoleto()}>
                  Gerar boleto
                </Button>
                {IS_DEV ? (
                  <Button type="button" variant="ghost" disabled={loading} onClick={() => void handleSimulate()}>
                    Simular pagamento (dev)
                  </Button>
                ) : null}
              </div>
              {paymentCharge ? <PaymentChargePanel charge={paymentCharge} /> : null}
            </div>
          ) : (
            <p className="mb-4 text-sm text-[var(--color-success)]">Nenhuma fatura pendente no momento.</p>
          )}

          <h3 className="mb-2 font-semibold">
            Cartão recorrente{PAYMENTS_MOCK ? ' (mock)' : ''}
          </h3>
          {hasPaymentMethod ? (
            <p className="mb-4 text-sm text-[var(--color-success)]">Cartão já cadastrado.</p>
          ) : (
            <form onSubmit={handleSaveCard} className="mb-4 space-y-3">
              <div>
                <Label htmlFor="ob-card">Últimos 4 dígitos</Label>
                <Input
                  id="ob-card"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                />
              </div>
              <Button type="submit" disabled={loading || cardLast4.length !== 4}>
                Salvar cartão
              </Button>
            </form>
          )}

          {paymentMessage ? (
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">{paymentMessage}</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => setStep('Modalidades')}>
              Voltar
            </Button>
            <Button type="button" fullWidth disabled={loading} onClick={() => void finishOnboarding()}>
              {loading ? 'Concluindo...' : 'Ir para o painel'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
