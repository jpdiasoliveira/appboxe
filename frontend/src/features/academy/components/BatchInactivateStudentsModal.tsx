import { useState } from 'react'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Button } from '../../../components/ui/Button'
import { fieldClassName } from '../../../components/ui/field-class'
import { Label } from '../../../components/ui/Label'
import { Modal } from '../../../components/ui/Modal'
import { batchInactivateStudentsByStaff } from '../academy-api'

interface BatchInactivateStudentsModalProps {
  open: boolean
  studentIds: string[]
  onClose: () => void
  onInactivated: () => void
}

export function BatchInactivateStudentsModal({
  open,
  studentIds,
  onClose,
  onInactivated,
}: BatchInactivateStudentsModalProps) {
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
    if (studentIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      await batchInactivateStudentsByStaff(studentIds, reason)
      onInactivated()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inativar alunos')
    } finally {
      setLoading(false)
    }
  }

  const count = studentIds.length

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Inativar ${count} aluno${count === 1 ? '' : 's'}`}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" form="batch-inactivate-form" disabled={loading || count === 0}>
            {loading ? 'Salvando...' : `Inativar ${count} aluno${count === 1 ? '' : 's'}`}
          </Button>
        </div>
      }
    >
      <form id="batch-inactivate-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          Os alunos selecionados deixam de aparecer como ativos. O histórico é mantido.
        </p>
        <div>
          <Label htmlFor="batch-inactive-reason">Motivo da inativação *</Label>
          <textarea
            id="batch-inactive-reason"
            className={`${fieldClassName} mt-1 min-h-24 resize-y`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: encerramento de turma, migração de unidade..."
            required
          />
        </div>
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      </form>
    </Modal>
  )
}
