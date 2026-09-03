import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ScheduleCalendar } from '../../components/ScheduleCalendar'
import { Button } from '../../components/ui/Button'
import { useStudentContext } from '../../contexts/StudentContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { addDays, formatWeekRange, startOfWeek } from '../../lib/schedule-utils'
import { fetchStudentClassSessions } from './schedule-api'

export function StudentSchedulePage() {
  const { student } = useStudentContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(student?.academy_id ?? null, 'module_class_schedule')
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchStudentClassSessions>>>([])
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => {
    const start = startOfWeek(weekAnchor)
    const end = addDays(start, 7)
    return {
      from: start.toISOString(),
      to: end.toISOString(),
      label: formatWeekRange(start),
    }
  }, [weekAnchor])

  useEffect(() => {
    if (!student) return
    fetchStudentClassSessions(range.from, range.to)
      .then(setSessions)
      .catch((e: Error) => setError(e.message))
  }, [student, range.from, range.to])

  if (!flagLoading && !enabled) {
    return <Navigate to="/student/dashboard" replace />
  }

  if (!student) {
    return <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Minha agenda</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Turmas das suas modalidades, aulas individuais e eventos da academia.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}>
            ← Semana anterior
          </Button>
          <Button type="button" variant="ghost" onClick={() => setWeekAnchor(new Date())}>
            Hoje
          </Button>
          <Button type="button" variant="ghost" onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}>
            Próxima semana →
          </Button>
        </div>
      </div>

      <p className="mb-4 text-sm text-[var(--color-text-muted)]">{range.label}</p>
      {error ? <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p> : null}

      <ScheduleCalendar weekAnchor={weekAnchor} sessions={sessions} readOnly />
    </div>
  )
}
