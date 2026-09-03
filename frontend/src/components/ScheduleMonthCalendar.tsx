import type { ClassSessionRow } from '../lib/schedule-types'
import {
  addMonths,
  dateKey,
  formatMonthLabel,
  getMonthCalendarDays,
} from '../lib/schedule-utils'

const WEEKDAY_HEADERS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface ScheduleMonthCalendarProps {
  monthAnchor: Date
  selectedDate: string
  sessions: ClassSessionRow[]
  onMonthChange: (date: Date) => void
  onSelectDate: (dateKey: string) => void
}

function sessionDateKey(startsAt: string): string {
  return startsAt.slice(0, 10)
}

export function ScheduleMonthCalendar({
  monthAnchor,
  selectedDate,
  sessions,
  onMonthChange,
  onSelectDate,
}: ScheduleMonthCalendarProps) {
  const days = getMonthCalendarDays(monthAnchor)
  const todayKey = dateKey(new Date())

  const countByDay = new Map<string, number>()
  for (const session of sessions) {
    const key = sessionDateKey(session.starts_at)
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1)
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize">{formatMonthLabel(monthAnchor)}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]"
            onClick={() => onMonthChange(addMonths(monthAnchor, -1))}
          >
            ←
          </button>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]"
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
            className="rounded-lg px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]"
            onClick={() => onMonthChange(addMonths(monthAnchor, 1))}
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase text-[var(--color-text-muted)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-1">
        {days.map((day) => {
          const count = countByDay.get(day.key) ?? 0
          const isSelected = day.key === selectedDate
          const isToday = day.key === todayKey

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelectDate(day.key)}
              className={`flex min-h-10 flex-col items-center justify-center rounded-lg border p-0.5 text-xs transition-colors sm:min-h-[3.25rem] sm:p-1 ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-text)]'
                  : isToday
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] bg-[var(--color-input-bg)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-card)]'
              } ${!day.inMonth ? 'opacity-45' : ''}`}
            >
              <span className="font-medium">{day.date.getDate()}</span>
              {count > 0 ? (
                <span className="mt-0.5 flex gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full bg-[var(--color-primary)]"
                    />
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
