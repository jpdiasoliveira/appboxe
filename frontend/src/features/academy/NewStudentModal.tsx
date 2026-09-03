import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { NewStudentForm } from './components/NewStudentForm'

interface NewStudentModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewStudentModal({ open, onClose, onCreated }: NewStudentModalProps) {
  const [formLoading, setFormLoading] = useState(false)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo aluno"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="new-student-form" disabled={formLoading}>
            {formLoading ? 'Salvando...' : 'Cadastrar aluno'}
          </Button>
        </div>
      }
    >
      {open ? (
        <NewStudentForm
          key="new-student-form"
          hideActions
          onLoadingChange={setFormLoading}
          onSuccess={() => {
            onCreated()
            onClose()
          }}
          onCancel={onClose}
          showCancel
        />
      ) : null}
    </Modal>
  )
}
