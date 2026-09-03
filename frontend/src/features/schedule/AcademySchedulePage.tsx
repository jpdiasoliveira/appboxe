import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { ScheduleAppointmentsList } from '../../components/ScheduleAppointmentsList'
import { ScheduleMonthCalendar } from '../../components/ScheduleMonthCalendar'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { type ClassSessionRow } from '../../lib/schedule-types'
import {
  addDays,
  dateKey,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from '../../lib/schedule-utils'
import { fetchCategories, fetchStudents } from '../academy/academy-api'
import {
  cancelClassSession,
  fetchAcademyClassSessions,
  updateClassSessionPlan,
} from './schedule-api'
import { fetchClassGroups } from '../academy/class-groups-api'
import { ClassSessionCreateForm } from './components/ClassSessionCreateForm'
import { ClassSessionPlanModal } from './components/ClassSessionPlanModal'

export function AcademySchedulePage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_class_schedule')
  const { enabled: classGroupsEnabled } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchAcademyClassSessions>>>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [classGroups, setClassGroups] = useState<{ id: string; name: string; training_category_id: string }[]>([])
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSessionRow | null>(null)

  const range = useMemo(() => {
    const monthStart = startOfMonth(monthAnchor)
    const monthEnd = endOfMonth(monthAnchor)
    const gridStart = startOfWeek(monthStart)
    const gridEnd = addDays(startOfWeek(monthEnd), 7)
    return {
      from: gridStart.toISOString(),
      to: gridEnd.toISOString(),
    }
  }, [monthAnchor])

  async function loadSessions() {
    if (!activeAcademyId) return
    const data = await fetchAcademyClassSessions(activeAcademyId, range.from, range.to)
    setSessions(data)
  }

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId).then((rows) =>
      setCategories(rows.map((c) => ({ id: c.id, name: c.name }))),
    )
    fetchStudents(activeAcademyId, 'ATIVO').then((rows) =>
      setStudents(
        rows.map((row) => ({
          id: row.id,
          name: Array.isArray(row.profile) ? row.profile[0]?.name ?? '—' : row.profile?.name ?? '—',
        })),
      ),
    )
    if (classGroupsEnabled) {
      fetchClassGroups(activeAcademyId).then((rows) =>
        setClassGroups(
          rows.map((g) => ({
            id: g.id,
            name: g.name,
            training_category_id: g.training_category_id,
          })),
        ),
      )
    }
  }, [activeAcademyId, classGroupsEnabled])

  useEffect(() => {
    if (!activeAcademyId) return
    loadSessions().catch((e: Error) => setError(e.message))
  }, [activeAcademyId, range.from, range.to])

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  function handleSelectDate(nextDate: string) {
    setSelectedDate(nextDate)
  }

  function openCreateModal() {
    setError(null)
    setSuccess(null)
    setCreateModalOpen(true)
  }

  async function handleCreateSuccess(message: string, date: string) {
    setSuccess(message)
    setSelectedDate(date)
    setCreateModalOpen(false)
    await loadSessions()
  }

  async function handleCancel(sessionId: string) {
    if (!window.confirm('Cancelar este horário?')) return
    setError(null)
    try {
      await cancelClassSession(sessionId)
      await loadSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar')
    }
  }

  if (!activeAcademyId) {
    return <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        actions={
          <Button type="button" className="w-full lg:hidden" onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />
            Nova aula
          </Button>
        }
      />

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage variant="success" className="mb-4">
          {success}
        </FeedbackMessage>
      ) : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-5 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <ScheduleMonthCalendar
            monthAnchor={monthAnchor}
            selectedDate={selectedDate}
            sessions={sessions}
            onMonthChange={setMonthAnchor}
            onSelectDate={handleSelectDate}
          />
          <ScheduleAppointmentsList
            selectedDate={selectedDate}
            sessions={sessions}
            onCancelSession={handleCancel}
            onEditPlan={setEditingSession}
            onAddAppointment={openCreateModal}
          />
        </div>

        <div className="hidden lg:block lg:col-span-2 lg:self-start">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
            <h3 className="mb-4 text-lg font-semibold">Nova aula</h3>
            <ClassSessionCreateForm
              academyId={activeAcademyId}
              categories={categories}
              classGroups={classGroups}
              students={students}
              initialDate={selectedDate}
              onSuccess={(msg, date) => void handleCreateSuccess(msg, date)}
              onError={setError}
            />
          </div>
        </div>
      </div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Nova aula"
        size="lg"
      >
        <ClassSessionCreateForm
          key={selectedDate}
          academyId={activeAcademyId}
          categories={categories}
          classGroups={classGroups}
          students={students}
          initialDate={selectedDate}
          onSuccess={(msg, date) => void handleCreateSuccess(msg, date)}
          onError={setError}
          onCancel={() => setCreateModalOpen(false)}
        />
      </Modal>

      <ClassSessionPlanModal
        open={editingSession != null}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSave={async (input) => {
          if (!editingSession) return
          await updateClassSessionPlan(editingSession.id, {
            title: input.title,
            lessonDescription: input.lessonDescription || null,
            visibleToStudent: input.visibleToStudent,
            notes: input.notes || null,
          })
          await loadSessions()
        }}
      />
    </div>
  )
}
