import { Link } from 'react-router-dom'
import { CakeIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../../components/ui/Badge'
import type { StudentBirthdayEntry } from '../../../lib/academy-types'
import { formatStudentStatus, studentStatusVariant } from '../../../lib/student-status'
import type { ClassSessionRow } from '../../../lib/schedule-types'
import { formatSessionTime } from '../../../lib/schedule-utils'
import {
  ageOnDate,
  filterBirthdaysForDay,
  formatDashboardDayLabel,
} from './DashboardMiniCalendar'

interface DashboardDayPanelProps {
  selectedDate: string
  birthdays: StudentBirthdayEntry[]
  sessions: ClassSessionRow[]
  showSchedule: boolean
}

export function DashboardDayPanel({
  selectedDate,
  birthdays,
  sessions,
  showSchedule,
}: DashboardDayPanelProps) {
  const dayBirthdays = filterBirthdaysForDay(birthdays, selectedDate)
  const daySessions = sessions.filter((s) => s.starts_at.slice(0, 10) === selectedDate)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <h3 className="mb-4 text-sm font-semibold capitalize">{formatDashboardDayLabel(selectedDate)}</h3>

      <section className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <CakeIcon className="h-4 w-4 text-amber-400" />
          Aniversariantes
        </div>
        {dayBirthdays.length > 0 ? (
          <ul className="space-y-2">
            {dayBirthdays.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2"
              >
                <div className="min-w-0">
                  <Link
                    to={`/academy/alunos/${student.id}`}
                    className="truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                  >
                    {student.name}
                  </Link>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {ageOnDate(student.birth_date, selectedDate)} anos
                  </p>
                </div>
                <Badge variant={studentStatusVariant(student.status)}>
                  {formatStudentStatus(student.status)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Nenhum aniversário neste dia.</p>
        )}
      </section>

      {showSchedule ? (
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <CalendarDaysIcon className="h-4 w-4" />
            Aulas
          </div>
          {daySessions.length > 0 ? (
            <ul className="space-y-2">
              {daySessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2"
                >
                  <p className="text-sm font-medium">{session.title || 'Aula'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatSessionTime(session.starts_at, session.ends_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhuma aula agendada.</p>
          )}
          <Link
            to="/academy/agenda"
            className="mt-3 inline-block text-xs text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
          >
            Ver agenda completa →
          </Link>
        </section>
      ) : null}
    </div>
  )
}
