import type { ClassSessionRow } from '../lib/schedule-types'
import { EVENT_KIND_LABELS, SESSION_TYPE_LABELS } from '../lib/schedule-types'
import { formatSessionTime } from '../lib/schedule-utils'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'

interface ScheduleAppointmentsListProps {
  selectedDate: string
  sessions: ClassSessionRow[]
  readOnly?: boolean
  onCancelSession?: (sessionId: string) => void
  onEditPlan?: (session: ClassSessionRow) => void
  onAddAppointment?: () => void
}

function sessionDateKey(startsAt: string): string {
  return startsAt.slice(0, 10)
}

function formatSelectedDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function ScheduleAppointmentsList({
  selectedDate,
  sessions,
  readOnly = false,
  onCancelSession,
  onEditPlan,
  onAddAppointment,
}: ScheduleAppointmentsListProps) {
  const daySessions = sessions
    .filter((s) => sessionDateKey(s.starts_at) === selectedDate)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Compromissos</h3>
          <p className="mt-0.5 text-xs capitalize text-[var(--color-text-muted)]">
            {formatSelectedDateLabel(selectedDate)}
          </p>
        </div>
        {!readOnly && onAddAppointment ? (
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 px-3 py-2 text-xs lg:hidden"
            onClick={onAddAppointment}
          >
            + Nova aula
          </Button>
        ) : null}
      </div>

      {daySessions.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-text-muted)]">Nenhum compromisso neste dia.</p>
          {!readOnly && onAddAppointment ? (
            <Button type="button" variant="ghost" fullWidth onClick={onAddAppointment}>
              Adicionar aula neste dia
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {daySessions.map((session) => (
            <li
              key={session.id}
              className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 ${
                !readOnly && onEditPlan ? 'cursor-pointer hover:bg-[var(--color-bg)]' : ''
              }`}
              onClick={() => {
                if (!readOnly && onEditPlan) onEditPlan(session)
              }}
              onKeyDown={(e) => {
                if (!readOnly && onEditPlan && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onEditPlan(session)
                }
              }}
              role={!readOnly && onEditPlan ? 'button' : undefined}
              tabIndex={!readOnly && onEditPlan ? 0 : undefined}
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className="mt-1 h-10 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: session.color }}
                />
                <div>
                  <p className="font-medium">{session.title}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {formatSessionTime(session.starts_at, session.ends_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="muted">{SESSION_TYPE_LABELS[session.session_type]}</Badge>
                    <Badge variant="muted">{EVENT_KIND_LABELS[session.event_kind]}</Badge>
                    {!readOnly && session.visible_to_student === false ? (
                      <Badge variant="warning">Oculto do aluno</Badge>
                    ) : null}
                  </div>
                  {session.lesson_description ? (
                    <p className="mt-2 text-sm text-[var(--color-text)]">{session.lesson_description}</p>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">Sem plano da aula ainda.</p>
                  )}
                  {session.notes && !readOnly ? (
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Interno: {session.notes}
                    </p>
                  ) : null}
                </div>
              </div>
              {!readOnly ? (
                <div className="flex flex-col items-end gap-2">
                  {onEditPlan ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--color-primary)] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditPlan(session)
                      }}
                    >
                      Editar
                    </button>
                  ) : null}
                  {onCancelSession ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--color-danger)] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCancelSession(session.id)
                      }}
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
