import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage, type FeedbackVariant } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { Select } from '../../components/ui/Select'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { usePagination } from '../../hooks/usePagination'
import { grantMakeupCredit } from './makeup-api'
import { fetchClassGroupMemberStudents, fetchClassGroups } from './class-groups-api'
import { fetchCategories, fetchStudentsForAttendance, recordAttendance } from './academy-api'

export function AttendancePage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading } = useFeatureFlag(activeAcademyId, 'module_attendance')
  const { enabled: makeupEnabled } = useFeatureFlag(activeAcademyId, 'module_class_makeup')
  const { enabled: classGroupsEnabled } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [classGroups, setClassGroups] = useState<{ id: string; name: string; training_category_id: string }[]>([])
  const [students, setStudents] = useState<{ id: string; name: string }[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')
  const [classDate, setClassDate] = useState(new Date().toISOString().slice(0, 10))
  const [presentIds, setPresentIds] = useState<Set<string>>(new Set())
  const [makeupCreditIds, setMakeupCreditIds] = useState<Set<string>>(new Set())
  const [feedback, setFeedback] = useState<{ variant: FeedbackVariant; message: string } | null>(null)

  const pagination = usePagination(students, { resetKey: `${categoryId}-${students.length}` })

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId).then((c) => setCategories(c))
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
    if (classGroupId) {
      fetchClassGroupMemberStudents(classGroupId).then(setStudents)
      return
    }
    fetchStudentsForAttendance(activeAcademyId).then((s) =>
      setStudents(
        s.map((row) => ({
          id: row.id,
          name: Array.isArray(row.profile)
            ? row.profile[0]?.name ?? '—'
            : row.profile?.name ?? '—',
        })),
      ),
    )
  }, [activeAcademyId, classGroupId])

  if (!loading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  async function save() {
    if (!activeAcademyId || !categoryId) return
    setFeedback(null)
    try {
      let makeupGranted = 0
      for (const st of students) {
        const present = presentIds.has(st.id)
        await recordAttendance({
          academyId: activeAcademyId,
          studentId: st.id,
          categoryId,
          classDate,
          present,
          classGroupId: classGroupId || undefined,
        })
        if (makeupEnabled && !present && makeupCreditIds.has(st.id)) {
          await grantMakeupCredit({
            studentId: st.id,
            trainingCategoryId: categoryId,
            notes: `Falta em ${classDate}`,
          })
          makeupGranted += 1
        }
      }
      setFeedback({
        variant: 'success',
        message:
          makeupGranted > 0
            ? `Presença salva. ${makeupGranted} crédito(s) de reposição concedido(s).`
            : 'Presença salva.',
      })
      setMakeupCreditIds(new Set())
    } catch (e) {
      setFeedback({
        variant: 'error',
        message: e instanceof Error ? e.message : 'Erro ao salvar',
      })
    }
  }

  function toggle(id: string) {
    setPresentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setMakeupCreditIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function toggleMakeupCredit(id: string) {
    setMakeupCreditIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div>
      <PageHeader title="Presença" />

      <p className="mb-4 text-sm">
        <Link to="/academy/presenca/qr" className="text-[var(--color-primary)] hover:underline">
          Usar check-in por QR
        </Link>
      </p>

      <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="grid grid-cols-[minmax(0,1fr)_8.75rem] items-end gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <div className="min-w-0">
            <Label htmlFor="attendance-category" className="text-xs sm:text-sm">
              Categoria
            </Label>
            <Select
              id="attendance-category"
              className="mt-1"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setClassGroupId('')
              }}
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          {classGroupsEnabled ? (
            <div className="min-w-0">
              <Label htmlFor="attendance-group" className="text-xs sm:text-sm">
                Turma fixa
              </Label>
              <Select
                id="attendance-group"
                className="mt-1"
                value={classGroupId}
                onChange={(e) => setClassGroupId(e.target.value)}
              >
                <option value="">Todos da modalidade</option>
                {classGroups
                  .filter((g) => g.training_category_id === categoryId)
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </Select>
            </div>
          ) : null}

          <div className="min-w-0">
            <Label htmlFor="attendance-date" className="text-xs sm:text-sm">
              Data
            </Label>
            <Input
              id="attendance-date"
              type="date"
              className="mt-1 px-2 sm:px-3.5"
              value={classDate}
              onChange={(e) => setClassDate(e.target.value)}
            />
          </div>

          <Button
            onClick={save}
            disabled={!categoryId}
            className="col-span-2 w-full sm:col-auto sm:w-auto"
          >
            Salvar chamada
          </Button>
        </div>
      </div>

      {feedback ? (
        <FeedbackMessage variant={feedback.variant} className="mb-4">
          {feedback.message}
        </FeedbackMessage>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        {pagination.totalItems === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Nenhum aluno ativo para chamada.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {pagination.paginatedItems.map((s) => {
              const present = presentIds.has(s.id)
              return (
                <li key={s.id} className="flex min-h-11 flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-[var(--color-primary)]"
                      checked={present}
                      onChange={() => toggle(s.id)}
                    />
                    <span className="text-sm">{s.name}</span>
                  </div>
                  {makeupEnabled && !present ? (
                    <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] sm:ml-auto">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--color-primary)]"
                        checked={makeupCreditIds.has(s.id)}
                        onChange={() => toggleMakeupCredit(s.id)}
                      />
                      Conceder crédito de reposição
                    </label>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          from={pagination.from}
          to={pagination.to}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  )
}
