import type { ClassSessionRow } from '../lib/schedule-types'
import { EVENT_KIND_LABELS, SESSION_TYPE_LABELS } from '../lib/schedule-types'
import { addDays, formatSessionTime, startOfWeek } from '../lib/schedule-utils'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface ScheduleCalendarProps {
  weekAnchor: Date
  sessions: ClassSessionRow[]
  readOnly?: boolean
  onCancelSession?: (sessionId: string) => void
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sessionDateKey(startsAt: string): string {
  return startsAt.slice(0, 10)
}

export function ScheduleCalendar({
  weekAnchor,
  sessions,
  readOnly = false,
  onCancelSession,
}: ScheduleCalendarProps) {
  const weekStart = startOfWeek(weekAnchor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const byDay = new Map<string, ClassSessionRow[]>()
  for (const session of sessions) {
    const key = sessionDateKey(session.starts_at)
    const list = byDay.get(key) ?? []
    list.push(session)
    byDay.set(key, list)
  }

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day, index) => {
        const key = dateKey(day)
        const daySessions = byDay.get(key) ?? []
        const isToday = key === dateKey(new Date())

        return (
          <div
            key={key}
            className={`min-h-48 rounded-xl border p-3 ${
              isToday
                ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5'
                : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)]'
            }`}
          >
            <div className="mb-3 border-b border-[var(--color-border)] pb-2">
              <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                {WEEKDAY_LABELS[index]}
              </p>
              <p className="text-sm font-medium">
                {day.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </p>
            </div>

            <div className="space-y-2">
              {daySessions.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">Sem aulas</p>
              ) : (
                daySessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-lg border border-white/10 p-2 text-xs text-white shadow-sm"
                    style={{ backgroundColor: session.color }}
                  >
                    <p className="font-semibold leading-tight">{session.title}</p>
                    <p className="mt-1 opacity-90">{formatSessionTime(session.starts_at, session.ends_at)}</p>
                    <p className="mt-1 opacity-80">
                      {SESSION_TYPE_LABELS[session.session_type]} · {EVENT_KIND_LABELS[session.event_kind]}
                    </p>
                    {session.lesson_description ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap opacity-95">
                        {session.lesson_description}
                      </p>
                    ) : null}
                    {!readOnly && onCancelSession ? (
                      <button
                        type="button"
                        className="mt-2 rounded bg-black/20 px-2 py-0.5 text-[10px] hover:bg-black/30"
                        onClick={() => onCancelSession(session.id)}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
