import { useState } from 'react'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Button } from '../../../components/ui/Button'
import { fieldClassName } from '../../../components/ui/field-class'
import { Label } from '../../../components/ui/Label'
import { Modal } from '../../../components/ui/Modal'
import type { StudentRow } from '../../../lib/academy-types'
import { inactivateStudentByStaff } from '../academy-api'
import { studentDisplayName } from '../student-edit-utils'

interface InactivateStudentModalProps {
  open: boolean
  student: StudentRow | null
  onClose: () => void
  onInactivated: () => void
}

export function InactivateStudentModal({
  open,
  student,
  onClose,
  onInactivated,
}: InactivateStudentModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setReason('')
    setError(null)
    setLoading(false)
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!student) return
    setLoading(true)
    setError(null)
    try {
      await inactivateStudentByStaff(student.id, reason)
      onInactivated()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inativar aluno')
    } finally {
      setLoading(false)
    }
  }

  const name = student ? studentDisplayName(student) : ''

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={name && name !== '—' ? `Inativar — ${name}` : 'Inativar aluno'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form="inactivate-student-form" disabled={loading}>
            {loading ? 'Salvando...' : 'Inativar aluno'}
          </Button>
        </div>
      }
    >
      <form id="inactivate-student-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          O aluno deixa de aparecer como ativo e não poderá treinar até ser reativado. O histórico é
          mantido.
        </p>
        <div>
          <Label htmlFor="inactive-reason">Motivo da inativação *</Label>
          <textarea
            id="inactive-reason"
            className={`${fieldClassName} mt-1 min-h-24 resize-y`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: mudou de cidade, pediu cancelamento, lesão prolongada..."
            required
          />
        </div>
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      </form>
    </Modal>
  )
}
