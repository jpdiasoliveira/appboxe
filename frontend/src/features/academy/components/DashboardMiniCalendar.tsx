import {
  addMonths,
  dateKey,
  endOfMonth,
  formatMonthLabel,
  getMonthCalendarDays,
  startOfMonth,
} from '../../../lib/schedule-utils'
import type { StudentBirthdayEntry } from '../../../lib/academy-types'

const WEEKDAY_HEADERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

interface DashboardMiniCalendarProps {
  monthAnchor: Date
  selectedDate: string
  birthdays: StudentBirthdayEntry[]
  sessionDates: Set<string>
  onMonthChange: (date: Date) => void
  onSelectDate: (dateKey: string) => void
}

function monthDayKey(dateKeyStr: string): string {
  return dateKeyStr.slice(5)
}

function hasBirthday(birthdays: StudentBirthdayEntry[], dayKey: string): boolean {
  const md = monthDayKey(dayKey)
  return birthdays.some((b) => monthDayKey(b.birth_date) === md)
}

export function DashboardMiniCalendar({
  monthAnchor,
  selectedDate,
  birthdays,
  sessionDates,
  onMonthChange,
  onSelectDate,
}: DashboardMiniCalendarProps) {
  const days = getMonthCalendarDays(monthAnchor)
  const todayKey = dateKey(new Date())

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize">{formatMonthLabel(monthAnchor)}</h3>
        <div className="flex gap-0.5">
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
            onClick={() => onMonthChange(addMonths(monthAnchor, -1))}
            aria-label="Mês anterior"
          >
            ←
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
            onClick={() => {
              const today = new Date()
              onMonthChange(today)
              onSelectDate(todayKey)
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)]"
            onClick={() => onMonthChange(addMonths(monthAnchor, 1))}
            aria-label="Próximo mês"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAY_HEADERS.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className="py-0.5 text-center text-[9px] font-semibold uppercase text-[var(--color-text-muted)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const isSelected = day.key === selectedDate
          const isToday = day.key === todayKey
          const birthday = hasBirthday(birthdays, day.key)
          const hasSession = sessionDates.has(day.key)

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.key)}
              className={`flex min-h-[2rem] flex-col items-center justify-center rounded-md border p-0.5 text-[11px] transition-colors ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                  : isToday
                    ? 'border-[var(--color-primary)]/70 bg-[var(--color-primary)]/10'
                    : 'border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]'
              } ${!day.inMonth ? 'opacity-35' : ''}`}
            >
              <span className="font-medium leading-none">{day.date.getDate()}</span>
              {(birthday || hasSession) && (
                <span className="mt-0.5 flex gap-0.5">
                  {birthday ? (
                    <span className="h-1 w-1 rounded-full bg-amber-400" title="Aniversário" />
                  ) : null}
                  {hasSession ? (
                    <span className="h-1 w-1 rounded-full bg-[var(--color-primary)]" title="Aula" />
                  ) : null}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Aniversário
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
          Aula
        </span>
      </div>
    </div>
  )
}

export function formatDashboardDayLabel(dateKeyStr: string): string {
  const [y, m, d] = dateKeyStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  const todayStr = dateKey(today)
  if (dateKeyStr === todayStr) return 'Hoje'

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKeyStr === dateKey(tomorrow)) return 'Amanhã'

  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function filterBirthdaysForDay(
  birthdays: StudentBirthdayEntry[],
  dateKeyStr: string,
): StudentBirthdayEntry[] {
  const md = monthDayKey(dateKeyStr)
  return birthdays.filter((b) => monthDayKey(b.birth_date) === md)
}

export function ageOnDate(birthDate: string, dateKeyStr: string): number {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const [year, month, day] = dateKeyStr.split('-').map(Number)
  let age = year - birthYear
  if (month < birthMonth || (month === birthMonth && day < birthDay)) {
    age -= 1
  }
  return age
}

export function monthRangeIso(monthAnchor: Date): { from: string; to: string } {
  const start = startOfMonth(monthAnchor)
  const end = endOfMonth(monthAnchor)
  return {
    from: start.toISOString(),
    to: new Date(end.getTime() + 1).toISOString(),
  }
}
