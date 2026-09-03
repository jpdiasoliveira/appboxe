import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Modal } from '../../components/ui/Modal'
import type { PlanPeriod, StudentRow } from '../../lib/academy-types'
import { fetchBodyMetrics } from '../../lib/body-metrics-api'
import type { BodyMetricRow } from '../../lib/body-metrics-types'
import { StudentEditForm } from './components/StudentEditForm'
import {
  assignStudentPlanByStaff,
  fetchActivePlansForAssignment,
  fetchCategories,
  fetchStudentEditFormData,
  fetchStudentHistorySummary,
  updateStudentByStaff,
  updateStudentCategoriesByStaff,
  type StudentHistorySummary,
} from './academy-api'
import {
  EMPTY_STUDENT_EDIT_FIELDS,
  fieldsFromEditData,
  fieldsFromStudentRow,
  studentDisplayName,
  type StudentEditFields,
} from './student-edit-utils'
import type { StudentAttendanceSummaryRow } from '../../lib/academy-types'

interface StudentEditModalProps {
  open: boolean
  studentId: string | null
  initialRow: StudentRow | null
  academyId: string | null
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  return 'Erro ao carregar aluno'
}

export function StudentEditModal({
  open,
  studentId,
  initialRow,
  academyId,
  canEdit,
  onClose,
  onSaved,
}: StudentEditModalProps) {
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<StudentEditFields>(EMPTY_STUDENT_EDIT_FIELDS)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [planOptions, setPlanOptions] = useState<
    { id: string; name: string; price: number; period: PlanPeriod }[]
  >([])
  const [allCategories, setAllCategories] = useState<{ id: string; name: string; color: string | null }[]>([])
  const [historySummary, setHistorySummary] = useState<StudentHistorySummary | null>(null)
  const [historyMetrics, setHistoryMetrics] = useState<BodyMetricRow[]>([])
  const [historyAttendance, setHistoryAttendance] = useState<StudentAttendanceSummaryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setSyncing(false)
      setSaving(false)
      setError(null)
      setHistorySummary(null)
      setHistoryMetrics([])
      setHistoryAttendance([])
      return
    }

    if (initialRow) {
      setFields(fieldsFromStudentRow(initialRow))
    }

    if (!studentId || !academyId) return

    let cancelled = false
    setSyncing(true)
    setHistoryLoading(true)
    setError(null)

    void (async () => {
      const [detailResult, plansResult, categoriesResult, historyResult, metricsResult] =
        await Promise.allSettled([
          fetchStudentEditFormData(academyId, studentId),
          fetchActivePlansForAssignment(academyId),
          fetchCategories(academyId),
          fetchStudentHistorySummary(academyId, studentId),
          fetchBodyMetrics(studentId),
        ])

      if (cancelled) return

      if (detailResult.status === 'fulfilled') {
        setFields(fieldsFromEditData(detailResult.value.student))
        setSelectedPlanId(detailResult.value.planId ?? '')
        setSelectedCategoryIds(detailResult.value.categoryIds)
      } else {
        setError(errorMessage(detailResult.reason))
      }

      if (plansResult.status === 'fulfilled') {
        setPlanOptions(plansResult.value)
      }

      if (categoriesResult.status === 'fulfilled') {
        setAllCategories(categoriesResult.value.filter((c) => c.status === 'ATIVO'))
      }

      if (historyResult.status === 'fulfilled') {
        setHistorySummary(historyResult.value.summary)
        setHistoryAttendance(historyResult.value.recentAttendance)
      }

      if (metricsResult.status === 'fulfilled') {
        setHistoryMetrics(metricsResult.value)
      }

      setSyncing(false)
      setHistoryLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [open, studentId, academyId, initialRow])

  function updateField<K extends keyof StudentEditFields>(key: K, value: StudentEditFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentId || !canEdit) return

    setSaving(true)
    setError(null)

    try {
      await updateStudentByStaff(studentId, {
        name: fields.name,
        cpf: fields.cpf || null,
        phone: fields.phone || null,
        status: fields.status,
        birth_date: fields.birthDate || null,
        weight_kg: fields.weightKg ? Number(fields.weightKg) : null,
        height_cm: fields.heightCm ? Number(fields.heightCm) : null,
        emergency_contact_name: fields.emergencyName || null,
        emergency_contact_phone: fields.emergencyPhone || null,
        fights_count: fields.fightsCount ? Number(fields.fightsCount) : 0,
        sparring_sessions: fields.sparringSessions ? Number(fields.sparringSessions) : 0,
        training_started_at: fields.trainingStartedAt || null,
        inactive_reason: fields.status === 'INATIVO' ? fields.inactiveReason.trim() || null : null,
      })

      if (selectedPlanId) {
        await assignStudentPlanByStaff(studentId, selectedPlanId)
      }

      await updateStudentCategoriesByStaff(studentId, selectedCategoryIds)

      onSaved()
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!studentId) return null

  const titleName = fields.name || (initialRow ? studentDisplayName(initialRow) : '')
  const title = titleName && titleName !== '—' ? `Editar — ${titleName}` : 'Editar aluno'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            Histórico atualiza ao salvar peso ou presenças
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {canEdit ? (
              <Button type="submit" form="student-edit-form" disabled={saving || syncing}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}
      <StudentEditForm
        studentId={studentId}
        fields={fields}
        canEdit={canEdit}
        saving={saving}
        syncing={syncing}
        selectedPlanId={selectedPlanId}
        selectedCategoryIds={selectedCategoryIds}
        planOptions={planOptions}
        allCategories={allCategories}
        historySummary={historySummary}
        historyMetrics={historyMetrics}
        historyAttendance={historyAttendance}
        historyLoading={historyLoading}
        onFieldChange={updateField}
        onPlanChange={setSelectedPlanId}
        onToggleCategory={toggleCategory}
        onSubmit={(e) => void handleSubmit(e)}
        onClose={onClose}
        hideActions
      />
    </Modal>
  )
}
