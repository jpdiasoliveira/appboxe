import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { fieldClassName } from '../../components/ui/field-class'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { Label } from '../../components/ui/Label'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { Select } from '../../components/ui/Select'
import { BodyMetricsChart } from '../../components/BodyMetricsChart'
import { PhysicalAssessmentBanner } from '../../components/PhysicalAssessmentBanner'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePagination } from '../../hooks/usePagination'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { canAccessFinanceiro } from '../../lib/auth-utils'
import { formatDateBR } from '../../lib/date-utils'
import { formatPhoneBR } from '../../lib/phone-utils'
import { fetchBodyMetrics } from '../../lib/body-metrics-api'
import { fetchBodyAssessmentStatus } from '../../lib/body-assessment-api'
import type { BodyAssessmentStatus } from '../../lib/body-assessment-types'
import type { BodyMetricRow } from '../../lib/body-metrics-types'
import type { StudentDetailData, StudentAttendanceSummaryRow } from '../../lib/academy-types'
import type { InvoiceStatus, StudentStatus } from '../../lib/types'
import { formatStudentStatus, studentStatusVariant, STUDENT_STATUS_SELECT_OPTIONS } from '../../lib/student-status'
import { StudentHistoryPanel } from './components/StudentHistoryPanel'
import { StudentDocumentsSection } from './components/StudentDocumentsSection'
import { StudentMakeupSection } from './components/StudentMakeupSection'
import { StudentGraduationSection } from './components/StudentGraduationSection'
import {
  assignStudentPlanByStaff,
  fetchActivePlansForAssignment,
  fetchCategories,
  fetchStudentDetail,
  markAcademyInvoicePaidCash,
  updateStudentByStaff,
  updateStudentCategoriesByStaff,
  type StudentHistorySummary,
} from './academy-api'

type Tab = 'dados' | 'fisico' | 'historico' | 'plano' | 'modalidades' | 'documentos' | 'reposicoes' | 'graduacao' | 'faturas' | 'presenca'

const TABS: { id: Tab; label: string; financeOnly?: boolean; documentsOnly?: boolean; makeupOnly?: boolean; graduationOnly?: boolean }[] = [
  { id: 'dados', label: 'Dados' },
  { id: 'fisico', label: 'Físico' },
  { id: 'historico', label: 'Histórico' },
  { id: 'plano', label: 'Plano' },
  { id: 'modalidades', label: 'Modalidades' },
  { id: 'documentos', label: 'Documentos', documentsOnly: true },
  { id: 'reposicoes', label: 'Reposições', makeupOnly: true },
  { id: 'graduacao', label: 'Graduação', graduationOnly: true },
  { id: 'faturas', label: 'Faturas', financeOnly: true },
  { id: 'presenca', label: 'Presença' },
]

function invoiceVariant(status: InvoiceStatus): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'PAGO') return 'success'
  if (status === 'ATRASADO') return 'danger'
  if (status === 'PENDENTE') return 'warning'
  return 'muted'
}

export function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>()
  const { activeAcademyId, activeRole } = useAcademyContext()
  const { roles } = useAuth()

  const showFinance = activeRole ? canAccessFinanceiro([activeRole]) : canAccessFinanceiro(roles)
  const canEdit = activeRole?.role !== 'ASSISTANT'
  const canManageDocuments =
    activeRole?.role === 'SCHOOL_OWNER' ||
    activeRole?.role === 'PROFESSOR' ||
    activeRole?.role === 'ASSISTANT'
  const { enabled: documentsEnabled, loading: documentsFlagLoading } = useFeatureFlag(
    activeAcademyId,
    'module_student_documents',
  )
  const { enabled: makeupEnabled, loading: makeupFlagLoading } = useFeatureFlag(
    activeAcademyId,
    'module_class_makeup',
  )
  const { enabled: graduationEnabled, loading: graduationFlagLoading } = useFeatureFlag(
    activeAcademyId,
    'module_graduation',
  )
  const { enabled: physicalAssessmentEnabled } = useFeatureFlag(
    activeAcademyId,
    'module_physical_assessment',
  )

  const [tab, setTab] = useState<Tab>('dados')
  const [data, setData] = useState<StudentDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [status, setStatus] = useState<StudentStatus>('ATIVO')
  const [inactiveReason, setInactiveReason] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [fightsCount, setFightsCount] = useState('0')
  const [sparringSessions, setSparringSessions] = useState('0')
  const [trainingStartedAt, setTrainingStartedAt] = useState('')
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricRow[]>([])
  const [bodyAssessmentStatus, setBodyAssessmentStatus] = useState<BodyAssessmentStatus | null>(null)
  const [planOptions, setPlanOptions] = useState<{ id: string; name: string; price: number; period: string }[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null)

  const visibleTabs = TABS.filter((t) => {
    if (t.financeOnly && !showFinance) return false
    if (t.documentsOnly && !documentsEnabled) return false
    if (t.makeupOnly && !makeupEnabled) return false
    if (t.graduationOnly && !graduationEnabled) return false
    return true
  })
  const invoicePagination = usePagination(data?.invoices ?? [], {
    resetKey: `${studentId ?? ''}-faturas-${tab}`,
  })
  const attendancePagination = usePagination(data?.attendance ?? [], {
    resetKey: `${studentId ?? ''}-presenca-${tab}`,
  })

  type InvoiceRow = StudentDetailData['invoices'][number]

  const invoiceColumns: DataColumn<InvoiceRow>[] = [
    { id: 'due', header: 'Vencimento', primary: true, render: (inv) => inv.due_date },
    {
      id: 'amount',
      header: 'Valor',
      render: (inv) =>
        Number(inv.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      id: 'status',
      header: 'Status',
      render: (inv) => <Badge variant={invoiceVariant(inv.status)}>{inv.status}</Badge>,
    },
  ]

  const attendanceColumns: DataColumn<StudentAttendanceSummaryRow>[] = [
    { id: 'date', header: 'Data', primary: true, render: (row) => row.class_date },
    { id: 'category', header: 'Modalidade', render: (row) => row.category_name },
    {
      id: 'present',
      header: 'Presença',
      render: (row) => (
        <Badge variant={row.present ? 'success' : 'muted'}>
          {row.present ? 'Presente' : 'Falta'}
        </Badge>
      ),
    },
  ]

  useEffect(() => {
    if (!activeAcademyId || !studentId) return
    setLoading(true)
    setError(null)
    fetchStudentDetail(activeAcademyId, studentId, showFinance)
      .then((detail) => {
        setData(detail)
        const s = detail.student
        setName(s.profile_name === '—' ? '' : s.profile_name)
        setPhone(formatPhoneBR(s.phone ?? ''))
        setCpf(s.cpf ?? '')
        setStatus(s.status)
        setInactiveReason(s.inactive_reason ?? '')
        setBirthDate(s.birth_date ?? '')
        setWeightKg(s.weight_kg != null ? String(s.weight_kg) : '')
        setHeightCm(s.height_cm != null ? String(s.height_cm) : '')
        setEmergencyName(s.emergency_contact_name ?? '')
        setEmergencyPhone(formatPhoneBR(s.emergency_contact_phone ?? ''))
        setFightsCount(String(s.fights_count ?? 0))
        setSparringSessions(String(s.sparring_sessions ?? 0))
        setTrainingStartedAt(s.training_started_at ?? '')
        return fetchBodyMetrics(studentId)
      })
      .then((metrics) => {
        if (metrics) setBodyMetrics(metrics)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [activeAcademyId, studentId, showFinance])

  useEffect(() => {
    if (!studentId || !physicalAssessmentEnabled) {
      setBodyAssessmentStatus(null)
      return
    }
    fetchBodyAssessmentStatus(studentId)
      .then(setBodyAssessmentStatus)
      .catch(() => setBodyAssessmentStatus(null))
  }, [studentId, physicalAssessmentEnabled])

  useEffect(() => {
    if (!activeAcademyId || tab !== 'plano') return
    fetchActivePlansForAssignment(activeAcademyId)
      .then(setPlanOptions)
      .catch(() => setPlanOptions([]))
  }, [activeAcademyId, tab])

  useEffect(() => {
    if (!activeAcademyId || tab !== 'modalidades') return
    fetchCategories(activeAcademyId)
      .then((rows) => setAllCategories(rows.filter((c) => c.status === 'ATIVO')))
      .catch(() => setAllCategories([]))
  }, [activeAcademyId, tab])

  useEffect(() => {
    if (data?.subscription?.plan_id) {
      setSelectedPlanId(data.subscription.plan_id)
    } else {
      setSelectedPlanId('')
    }
    setSelectedCategoryIds(data?.categories.map((c) => c.id) ?? [])
  }, [data])

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0]?.id ?? 'dados')
    }
  }, [visibleTabs, tab])

  async function reload() {
    if (!activeAcademyId || !studentId) return
    const detail = await fetchStudentDetail(activeAcademyId, studentId, showFinance)
    setData(detail)
    const metrics = await fetchBodyMetrics(studentId)
    setBodyMetrics(metrics)
    if (physicalAssessmentEnabled) {
      const status = await fetchBodyAssessmentStatus(studentId)
      setBodyAssessmentStatus(status)
    }
  }

  async function markInvoicePaidCash(invoiceId: string, amount: number) {
    if (
      !window.confirm(
        `Confirmar pagamento em dinheiro de ${Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}?`,
      )
    ) {
      return
    }
    setPayingInvoiceId(invoiceId)
    setError(null)
    try {
      await markAcademyInvoicePaidCash(invoiceId)
      await reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar pagamento')
    } finally {
      setPayingInvoiceId(null)
    }
  }

  async function saveDados(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !canEdit) return
    setSaving(true)
    setError(null)
    try {
      await updateStudentByStaff(studentId, {
        name,
        phone: phone || null,
        cpf: cpf || null,
        status,
        inactive_reason: status === 'INATIVO' ? inactiveReason.trim() || null : null,
      })
      setSaved(true)
      await reload()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function saveFisico(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !canEdit) return
    setSaving(true)
    setError(null)
    try {
      await updateStudentByStaff(studentId, {
        birth_date: birthDate || null,
        weight_kg: weightKg ? Number(weightKg) : null,
        height_cm: heightCm ? Number(heightCm) : null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        fights_count: fightsCount ? Number(fightsCount) : 0,
        sparring_sessions: sparringSessions ? Number(sparringSessions) : 0,
        training_started_at: trainingStartedAt || null,
      })
      setSaved(true)
      await reload()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function savePlano(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !canEdit || !selectedPlanId) return
    setSaving(true)
    setError(null)
    try {
      await assignStudentPlanByStaff(studentId, selectedPlanId)
      setSaved(true)
      await reload()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar plano')
    } finally {
      setSaving(false)
    }
  }

  async function saveModalidades(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !canEdit) return
    setSaving(true)
    setError(null)
    try {
      await updateStudentCategoriesByStaff(studentId, selectedCategoryIds)
      setSaved(true)
      await reload()
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar modalidades')
    } finally {
      setSaving(false)
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Carregando aluno...</p>
  }

  if (error && !data) {
    return (
      <div>
        <Link to="/academy/alunos" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Voltar para alunos
        </Link>
        <FeedbackMessage variant="error" className="mt-4">
          {error}
        </FeedbackMessage>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <Link to="/academy/alunos" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Voltar para alunos
        </Link>
        <FeedbackMessage variant="warning" className="mt-4">
          Aluno não encontrado ou fora das suas modalidades.
        </FeedbackMessage>
      </div>
    )
  }

  const { student, subscription } = data

  const historySummary: StudentHistorySummary = {
    presentCount: data.attendance.filter((row) => row.present).length,
    absentCount: data.attendance.filter((row) => !row.present).length,
    fightsCount: student.fights_count ?? 0,
    sparringSessions: student.sparring_sessions ?? 0,
    trainingStartedAt: student.training_started_at ?? null,
    enrollmentDate: student.enrollment_date,
  }

  return (
    <div>
      <Link
        to="/academy/alunos"
        className="mb-4 inline-block text-sm text-[var(--color-primary)] hover:underline"
      >
        ← Voltar para alunos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{name || student.profile_name}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Matrícula: {formatDateBR(student.enrollment_date)}
            {student.onboarding_completed_at ? ' · Onboarding concluído' : ' · Onboarding pendente'}
          </p>
        </div>
        <Badge variant={studentStatusVariant(student.status)}>{formatStudentStatus(student.status)}</Badge>
      </div>

      {student.status === 'INATIVO' && student.inactive_reason ? (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]/50 px-4 py-3">
          <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Motivo da inativação
            {student.inactive_at
              ? ` · ${new Date(student.inactive_at).toLocaleDateString('pt-BR')}`
              : ''}
          </p>
          <p className="mt-1 text-sm">{student.inactive_reason}</p>
        </div>
      ) : null}

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-[var(--color-border)] p-1">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}
      {saved ? (
        <FeedbackMessage variant="success" className="mb-4">
          Alterações salvas.
        </FeedbackMessage>
      ) : null}

      {tab === 'dados' ? (
        <form onSubmit={saveDados} className="max-w-lg space-y-4">
          <div>
            <Label htmlFor="sd-name">Nome</Label>
            <Input
              id="sd-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              required
            />
          </div>
          <div>
            <Label htmlFor="sd-cpf">CPF</Label>
            <Input
              id="sd-cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="sd-phone">Telefone</Label>
            <PhoneInput
              id="sd-phone"
              value={phone}
              onChange={setPhone}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="sd-status">Status</Label>
            <select
              id="sd-status"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
              disabled={!canEdit}
            >
              {STUDENT_STATUS_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {status === 'INATIVO' ? (
            <div>
              <Label htmlFor="sd-inactive-reason">Motivo da inativação *</Label>
              <textarea
                id="sd-inactive-reason"
                className={`${fieldClassName} mt-1 min-h-20 resize-y`}
                value={inactiveReason}
                onChange={(e) => setInactiveReason(e.target.value)}
                disabled={!canEdit}
                required
              />
            </div>
          ) : null}
          {canEdit ? (
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar dados'}
            </Button>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Somente leitura (sub-professor).</p>
          )}
        </form>
      ) : null}

      {tab === 'fisico' ? (
        <form onSubmit={saveFisico} className="max-w-lg space-y-4">
          <PhysicalAssessmentBanner status={bodyAssessmentStatus} />
          <div>
            <Label htmlFor="sd-birth">Data de nascimento</Label>
            <Input
              id="sd-birth"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sd-weight">Peso (kg)</Label>
              <Input
                id="sd-weight"
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="sd-height">Altura (cm)</Label>
              <Input
                id="sd-height"
                type="number"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sd-em-name">Contato de emergência</Label>
            <Input
              id="sd-em-name"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="sd-em-phone">Tel. emergência</Label>
            <PhoneInput
              id="sd-em-phone"
              value={emergencyPhone}
              onChange={setEmergencyPhone}
              disabled={!canEdit}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sd-fights">Lutas oficiais</Label>
              <Input
                id="sd-fights"
                type="number"
                min="0"
                value={fightsCount}
                onChange={(e) => setFightsCount(e.target.value)}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="sd-sparring">Sessões de sparring</Label>
              <Input
                id="sd-sparring"
                type="number"
                min="0"
                value={sparringSessions}
                onChange={(e) => setSparringSessions(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sd-training-start">Início dos treinos</Label>
            <Input
              id="sd-training-start"
              type="date"
              value={trainingStartedAt}
              onChange={(e) => setTrainingStartedAt(e.target.value)}
              disabled={!canEdit}
            />
          </div>
          {canEdit ? (
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar dados físicos'}
            </Button>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Somente leitura (sub-professor).</p>
          )}

          <div className="border-t border-[var(--color-border)] pt-8">
            <h3 className="mb-4 text-lg font-semibold">Evolução física</h3>
            <BodyMetricsChart metrics={bodyMetrics} />
          </div>
        </form>
      ) : null}

      {tab === 'historico' ? (
        <div className="max-w-3xl">
          <StudentHistoryPanel
            summary={historySummary}
            metrics={bodyMetrics}
            recentAttendance={data.attendance}
          />
        </div>
      ) : null}

      {tab === 'plano' ? (
        <form onSubmit={savePlano} className="max-w-lg space-y-4 rounded-xl border border-[var(--color-border)] p-4">
          {subscription ? (
            <div className="rounded-lg bg-[var(--color-bg-elevated)] p-3 text-sm">
              <p className="font-semibold">{subscription.plan_name}</p>
              <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                {subscription.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="mt-1 text-[var(--color-text-muted)]">
                {subscription.period} · Status: {subscription.status}
              </p>
              <p className="text-[var(--color-text-muted)]">
                Próxima cobrança: {subscription.next_billing_date ?? '—'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum plano ativo vinculado.</p>
          )}

          {canEdit ? (
            <>
              <div>
                <Label htmlFor="sd-plan">Plano</Label>
                <Select
                  id="sd-plan"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  required
                >
                  <option value="">Selecione um plano</option>
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} —{' '}
                      {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /{' '}
                      {plan.period.toLowerCase()}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={saving || !selectedPlanId}>
                {saving ? 'Salvando...' : 'Salvar plano'}
              </Button>
            </>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Somente leitura (assistente).</p>
          )}
        </form>
      ) : null}

      {tab === 'modalidades' ? (
        <form onSubmit={saveModalidades} className="max-w-lg space-y-4">
          {allCategories.length > 0 ? (
            <ul className="space-y-2">
              {allCategories.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3"
                >
                  <input
                    type="checkbox"
                    id={`cat-${c.id}`}
                    checked={selectedCategoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                    disabled={!canEdit}
                    className="h-4 w-4 rounded border-[var(--color-border)]"
                  />
                  <label htmlFor={`cat-${c.id}`} className="flex flex-1 cursor-pointer items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.color ?? '#B91C1C' }}
                    />
                    <span>{c.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhuma modalidade cadastrada na academia.</p>
          )}
          {canEdit ? (
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar modalidades'}
            </Button>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">Somente leitura (assistente).</p>
          )}
        </form>
      ) : null}

      {tab === 'faturas' && showFinance ? (
        <ResponsiveDataList
          columns={invoiceColumns}
          rows={invoicePagination.paginatedItems}
          rowKey={(inv) => inv.id}
          emptyMessage="Nenhuma fatura registrada."
          renderActions={(inv) => (
            <RowActionsMenu
              ariaLabel={`Ações da fatura de ${inv.due_date}`}
              items={
                inv.status === 'PENDENTE' || inv.status === 'ATRASADO'
                  ? [
                      {
                        id: 'cash',
                        label:
                          payingInvoiceId === inv.id ? 'Registrando...' : 'Marcar pago (dinheiro)',
                        icon: CheckCircleIcon,
                        disabled: payingInvoiceId === inv.id,
                        onClick: () => void markInvoicePaidCash(inv.id, Number(inv.amount)),
                      },
                    ]
                  : []
              }
            />
          )}
          footer={
            <Pagination
              page={invoicePagination.page}
              pageSize={invoicePagination.pageSize}
              totalItems={invoicePagination.totalItems}
              totalPages={invoicePagination.totalPages}
              from={invoicePagination.from}
              to={invoicePagination.to}
              onPageChange={invoicePagination.setPage}
              onPageSizeChange={invoicePagination.setPageSize}
            />
          }
        />
      ) : null}

      {tab === 'presenca' ? (
        <ResponsiveDataList
          columns={attendanceColumns}
          rows={attendancePagination.paginatedItems}
          rowKey={(row) => row.id}
          emptyMessage="Nenhum registro de presença."
          footer={
            <Pagination
              page={attendancePagination.page}
              pageSize={attendancePagination.pageSize}
              totalItems={attendancePagination.totalItems}
              totalPages={attendancePagination.totalPages}
              from={attendancePagination.from}
              to={attendancePagination.to}
              onPageChange={attendancePagination.setPage}
              onPageSizeChange={attendancePagination.setPageSize}
            />
          }
        />
      ) : null}

      {tab === 'documentos' && documentsEnabled && activeAcademyId && studentId ? (
        documentsFlagLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Carregando módulo...</p>
        ) : (
          <StudentDocumentsSection
            academyId={activeAcademyId}
            studentId={studentId}
            canEdit={canManageDocuments}
          />
        )
      ) : null}

      {tab === 'reposicoes' && makeupEnabled && activeAcademyId && studentId ? (
        makeupFlagLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Carregando módulo...</p>
        ) : (
          <StudentMakeupSection
            studentId={studentId}
            categories={data.categories}
            canManage={canManageDocuments}
          />
        )
      ) : null}

      {tab === 'graduacao' && graduationEnabled && studentId && data ? (
        graduationFlagLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Carregando módulo...</p>
        ) : (
          <StudentGraduationSection
            studentId={studentId}
            categories={data.categories}
            canManage={canManageDocuments}
          />
        )
      ) : null}
    </div>
  )
}
