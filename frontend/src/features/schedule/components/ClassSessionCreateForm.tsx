import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { fieldClassName } from '../../../components/ui/field-class'
import {
  EVENT_COLOR_PRESETS,
  EVENT_KIND_LABELS,
  SESSION_TYPE_LABELS,
  type ScheduleEventKind,
  type ScheduleSessionType,
} from '../../../lib/schedule-types'
import { dateKey } from '../../../lib/schedule-utils'
import { createClassSessions } from '../schedule-api'

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

export interface ClassSessionCreateFormProps {
  academyId: string
  categories: { id: string; name: string }[]
  classGroups?: { id: string; name: string; training_category_id: string }[]
  students: { id: string; name: string }[]
  initialDate: string
  onSuccess: (message: string, date: string) => void
  onError: (message: string) => void
  onCancel?: () => void
}

export function ClassSessionCreateForm({
  academyId,
  categories,
  classGroups = [],
  students,
  initialDate,
  onSuccess,
  onError,
  onCancel,
}: ClassSessionCreateFormProps) {
  const [sessionType, setSessionType] = useState<ScheduleSessionType>('GROUP')
  const [eventKind, setEventKind] = useState<ScheduleEventKind>('CLASS')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [visibleToStudent, setVisibleToStudent] = useState(true)
  const [color, setColor] = useState(EVENT_COLOR_PRESETS.CLASS)
  const [categoryId, setCategoryId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [date, setDate] = useState(initialDate)
  const [timeStart, setTimeStart] = useState('19:00')
  const [timeEnd, setTimeEnd] = useState('20:00')
  const [repeatWeekly, setRepeatWeekly] = useState(false)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5])
  const [repeatUntil, setRepeatUntil] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 2)
    return dateKey(d)
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    setColor(EVENT_COLOR_PRESETS[eventKind])
  }, [eventKind])

  function toggleWeekday(day: number) {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (sessionType === 'GROUP' && !categoryId) {
      onError('Selecione a modalidade para aula em grupo.')
      return
    }
    if (sessionType === 'INDIVIDUAL' && !studentId) {
      onError('Selecione o aluno para aula individual.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createClassSessions({
        academyId,
        sessionType,
        eventKind,
        title: title.trim(),
        notes: notes.trim() || undefined,
        lessonDescription: lessonDescription.trim() || undefined,
        visibleToStudent,
        color,
        categoryId: sessionType === 'GROUP' || (sessionType === 'EVENT' && categoryId) ? categoryId : undefined,
        classGroupId: sessionType === 'GROUP' && classGroupId ? classGroupId : undefined,
        studentId: sessionType === 'INDIVIDUAL' ? studentId : undefined,
        date,
        timeStart,
        timeEnd,
        repeatWeekly,
        daysOfWeek: repeatWeekly ? daysOfWeek : undefined,
        repeatUntil: repeatWeekly ? repeatUntil : undefined,
      })
      setTitle('')
      setNotes('')
      setLessonDescription('')
      setVisibleToStudent(true)
      onSuccess(`${result.created} horário(s) criado(s).`, date)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Erro ao criar horário')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="session-type">Tipo</Label>
          <select
            id="session-type"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as ScheduleSessionType)}
          >
            {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="event-kind">Categoria do bloco</Label>
          <select
            id="event-kind"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            value={eventKind}
            onChange={(e) => setEventKind(e.target.value as ScheduleEventKind)}
          >
            {Object.entries(EVENT_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Título *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      {sessionType === 'GROUP' ? (
        <>
          <div>
            <Label htmlFor="category">Modalidade *</Label>
            <select
              id="category"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setClassGroupId('')
              }}
              required
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {classGroups.length > 0 ? (
            <div>
              <Label htmlFor="class-group">Turma fixa (opcional)</Label>
              <select
                id="class-group"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
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
              </select>
            </div>
          ) : null}
        </>
      ) : null}

      {sessionType === 'INDIVIDUAL' ? (
        <div>
          <Label htmlFor="student">Aluno *</Label>
          <select
            id="student"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {sessionType === 'EVENT' ? (
        <div>
          <Label htmlFor="event-category">Modalidade (opcional)</Label>
          <select
            id="event-category"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm text-[var(--color-text)]"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Toda a academia</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 grid-cols-1">
        <div>
          <Label htmlFor="date">Data *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="time-start">Início *</Label>
            <Input
              id="time-start"
              type="time"
              value={timeStart}
              onChange={(e) => setTimeStart(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="time-end">Fim *</Label>
            <Input
              id="time-end"
              type="time"
              value={timeEnd}
              onChange={(e) => setTimeEnd(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="color">Cor do bloco</Label>
        <input
          id="color"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="mt-1 h-10 w-14 cursor-pointer rounded border border-[var(--color-border)]"
        />
      </div>

      <div>
        <Label htmlFor="lesson-description">Como será a aula</Label>
        <textarea
          id="lesson-description"
          className={`${fieldClassName} mt-1 min-h-[100px] resize-y`}
          placeholder="Ex.: Hoje foco em defesa e contra-ataque, 3 rounds de sparring leve..."
          value={lessonDescription}
          onChange={(e) => setLessonDescription(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-[var(--color-border)]"
          checked={visibleToStudent}
          onChange={(e) => setVisibleToStudent(e.target.checked)}
        />
        <span>
          <span className="font-medium">Mostrar para o aluno</span>
          <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
            O aluno vê título e plano da aula na agenda dele.
          </span>
        </span>
      </label>

      <div>
        <Label htmlFor="notes">Observações internas</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Só a equipe vê" />
      </div>

      <fieldset className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
        <legend className="px-2 text-sm font-semibold">Repetir semanalmente</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={repeatWeekly}
            onChange={(e) => setRepeatWeekly(e.target.checked)}
          />
          Repetir nos dias selecionados
        </label>
        {repeatWeekly ? (
          <>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={daysOfWeek.includes(day.value)}
                    onChange={() => toggleWeekday(day.value)}
                  />
                  {day.label}
                </label>
              ))}
            </div>
            <div>
              <Label htmlFor="repeat-until">Repetir até</Label>
              <Input
                id="repeat-until"
                type="date"
                value={repeatUntil}
                onChange={(e) => setRepeatUntil(e.target.value)}
                required={repeatWeekly}
              />
            </div>
          </>
        ) : null}
      </fieldset>

      <div className={`flex gap-2 ${onCancel ? '' : ''}`}>
        {onCancel ? (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" fullWidth={!onCancel} className={onCancel ? 'flex-1' : ''} disabled={submitting}>
          {submitting ? 'Salvando...' : 'Adicionar aula'}
        </Button>
      </div>
    </form>
  )
}
