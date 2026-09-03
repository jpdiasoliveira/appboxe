import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/Button'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { ResponsiveDataList, type DataColumn } from '../../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../../components/ui/RowActionsMenu'
import { getStudentDocumentSignedUrl } from '../../../lib/student-document-storage'
import {
  formatFileSize,
  formatStudentDocumentSource,
  formatStudentDocumentType,
  STUDENT_DOCUMENT_SOURCE_OPTIONS,
  STUDENT_DOCUMENT_TYPE_OPTIONS,
  type StudentDocumentRow,
  type StudentDocumentSource,
  type StudentDocumentType,
} from '../../../lib/student-document-types'
import {
  deleteStudentDocument,
  fetchStudentDocuments,
  uploadStudentDocument,
} from '../student-documents-api'

interface StudentDocumentsSectionProps {
  academyId: string
  studentId: string
  canEdit: boolean
}

export function StudentDocumentsSection({
  academyId,
  studentId,
  canEdit,
}: StudentDocumentsSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<StudentDocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [documentType, setDocumentType] = useState<StudentDocumentType>('ATESTADO')
  const [receivedVia, setReceivedVia] = useState<StudentDocumentSource>('WHATSAPP')
  const [notes, setNotes] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchStudentDocuments(studentId)
      setDocuments(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [studentId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!canEdit || !selectedFile || !title.trim()) return

    setUploading(true)
    setError(null)
    try {
      await uploadStudentDocument({
        academyId,
        studentId,
        file: selectedFile,
        title: title.trim(),
        documentType,
        receivedVia,
        notes: notes.trim() || undefined,
      })
      setTitle('')
      setNotes('')
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar documento')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload(doc: StudentDocumentRow) {
    setError(null)
    try {
      const url = await getStudentDocumentSignedUrl(doc.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir arquivo')
    }
  }

  async function handleDelete(doc: StudentDocumentRow) {
    if (!canEdit) return
    if (!window.confirm(`Excluir o documento "${doc.title}"?`)) return

    setDeletingId(doc.id)
    setError(null)
    try {
      await deleteStudentDocument(doc)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir documento')
    } finally {
      setDeletingId(null)
    }
  }

  const columns: DataColumn<StudentDocumentRow>[] = [
    {
      id: 'title',
      header: 'Documento',
      primary: true,
      render: (doc) => (
        <div className="flex items-start gap-2">
          <DocumentIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-muted)]" />
          <div>
            <p className="font-medium">{doc.title}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {formatStudentDocumentType(doc.document_type)} · via{' '}
              {formatStudentDocumentSource(doc.received_via)}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'date',
      header: 'Enviado em',
      render: (doc) => new Date(doc.created_at).toLocaleDateString('pt-BR'),
    },
    {
      id: 'size',
      header: 'Tamanho',
      render: (doc) => formatFileSize(doc.file_size_bytes),
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Anexe atestados, laudos e outros arquivos que o aluno enviou por WhatsApp, e-mail ou
        presencialmente.
      </p>

      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      {canEdit ? (
        <form
          onSubmit={handleUpload}
          className="max-w-xl space-y-4 rounded-xl border border-[var(--color-border)] p-4"
        >
          <h3 className="text-sm font-semibold">Importar documento</h3>
          <div>
            <Label htmlFor="doc-title">Título *</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Atestado médico — março/2026"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="doc-type">Tipo</Label>
              <Select
                id="doc-type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as StudentDocumentType)}
              >
                {STUDENT_DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="doc-source">Recebido por</Label>
              <Select
                id="doc-source"
                value={receivedVia}
                onChange={(e) => setReceivedVia(e.target.value as StudentDocumentSource)}
              >
                {STUDENT_DOCUMENT_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="doc-notes">Observações</Label>
            <Input
              id="doc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="doc-file">Arquivo (PDF ou imagem, máx. 10 MB) *</Label>
            <input
              ref={fileRef}
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-bg-elevated)] file:px-3 file:py-2 file:text-sm file:font-medium"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              required
            />
          </div>
          <Button type="submit" disabled={uploading || !selectedFile || !title.trim()}>
            {uploading ? 'Enviando...' : 'Salvar documento'}
          </Button>
        </form>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">
          Somente leitura — você não tem permissão para importar ou excluir documentos.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando documentos...</p>
      ) : (
        <ResponsiveDataList
          columns={columns}
          rows={documents}
          rowKey={(doc) => doc.id}
          emptyMessage="Nenhum documento anexado ainda."
          renderActions={(doc) => (
            <RowActionsMenu
              ariaLabel={`Ações do documento ${doc.title}`}
              items={[
                {
                  id: 'download',
                  label: 'Baixar / visualizar',
                  icon: ArrowDownTrayIcon,
                  onClick: () => void handleDownload(doc),
                },
                ...(canEdit
                  ? [
                      {
                        id: 'delete',
                        label: deletingId === doc.id ? 'Excluindo...' : 'Excluir',
                        icon: TrashIcon,
                        disabled: deletingId === doc.id,
                        onClick: () => void handleDelete(doc),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        />
      )}
    </div>
  )
}
