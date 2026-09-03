import { useEffect, useState } from 'react'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Modal } from '../../../components/ui/Modal'
import { fieldClassName } from '../../../components/ui/field-class'
import type { ClassSessionRow } from '../../../lib/schedule-types'

interface ClassSessionPlanModalProps {
  session: ClassSessionRow | null
  open: boolean
  onClose: () => void
  onSave: (input: {
    title: string
    lessonDescription: string
    visibleToStudent: boolean
    notes: string
  }) => Promise<void>
}

export function ClassSessionPlanModal({ session, open, onClose, onSave }: ClassSessionPlanModalProps) {
  const [title, setTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [visibleToStudent, setVisibleToStudent] = useState(true)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session || !open) return
    setTitle(session.title)
    setLessonDescription(session.lesson_description ?? '')
    setVisibleToStudent(session.visible_to_student ?? true)
    setNotes(session.notes ?? '')
    setError(null)
  }, [session, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        lessonDescription: lessonDescription.trim(),
        visibleToStudent,
        notes: notes.trim(),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Plano da aula" size="lg">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <div>
          <Label htmlFor="plan-title">Título</Label>
          <Input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="plan-description">Como será a aula</Label>
          <textarea
            id="plan-description"
            className={`${fieldClassName} min-h-[120px] resize-y`}
            placeholder="Ex.: Aquecimento 10 min, técnica de jab-cross, finalização com sparring leve..."
            value={lessonDescription}
            onChange={(e) => setLessonDescription(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="plan-notes">Observações internas (opcional)</Label>
          <Input
            id="plan-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Só a equipe vê — não vai para o aluno"
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
              Desmarque para planejar a aula sem exibir no portal do aluno.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-[var(--color-border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar plano'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
