import { Link } from 'react-router-dom'
import { CakeIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../../components/ui/Badge'
import type { StudentBirthdayEntry } from '../../../lib/academy-types'
import { formatStudentStatus, studentStatusVariant } from '../../../lib/student-status'
import { dateKey } from '../../../lib/schedule-utils'
import { ageOnDate } from './DashboardMiniCalendar'

interface UpcomingBirthday {
  student: StudentBirthdayEntry
  nextDate: string
  daysUntil: number
}

function nextBirthdayOccurrence(birthDate: string, from: Date): UpcomingBirthday['nextDate'] | null {
  const [, month, day] = birthDate.split('-').map(Number)
  const year = from.getFullYear()
  let candidate = new Date(year, month - 1, day)
  if (candidate < from) {
    candidate = new Date(year + 1, month - 1, day)
  }
  return dateKey(candidate)
}

function getUpcomingBirthdays(birthdays: StudentBirthdayEntry[], limit = 6): UpcomingBirthday[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const items = birthdays
    .map((student) => {
      const nextDate = nextBirthdayOccurrence(student.birth_date, today)
      if (!nextDate) return null
      const [y, m, d] = nextDate.split('-').map(Number)
      const next = new Date(y, m - 1, d)
      const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
      return { student, nextDate, daysUntil }
    })
    .filter((item): item is UpcomingBirthday => item != null)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, limit)

  return items
}

function formatUpcomingLabel(nextDate: string, daysUntil: number): string {
  if (daysUntil === 0) return 'Hoje'
  if (daysUntil === 1) return 'Amanhã'
  const [y, m, d] = nextDate.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface DashboardUpcomingBirthdaysProps {
  birthdays: StudentBirthdayEntry[]
}

export function DashboardUpcomingBirthdays({ birthdays }: DashboardUpcomingBirthdaysProps) {
  const upcoming = getUpcomingBirthdays(birthdays)

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-4 flex items-center gap-2">
        <CakeIcon className="h-5 w-5 text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold">Próximos aniversários</h3>
          <p className="text-xs text-[var(--color-text-muted)]">Nos próximos dias</p>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Nenhum aniversário próximo.</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map(({ student, nextDate, daysUntil }) => (
            <li
              key={student.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  to={`/academy/alunos/${student.id}`}
                  className="truncate text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                >
                  {student.name}
                </Link>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {formatUpcomingLabel(nextDate, daysUntil)} · {ageOnDate(student.birth_date, nextDate)} anos
                </p>
              </div>
              <Badge variant={studentStatusVariant(student.status)}>
                {formatStudentStatus(student.status)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
