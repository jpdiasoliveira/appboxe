export type StudentDocumentType = 'SAUDE' | 'ATESTADO' | 'CONTRATO' | 'OUTRO'

export type StudentDocumentSource = 'WHATSAPP' | 'EMAIL' | 'PRESENCIAL' | 'OUTRO'

export interface StudentDocumentRow {
  id: string
  academy_id: string
  student_id: string
  document_type: StudentDocumentType
  title: string
  file_path: string
  mime_type: string
  file_size_bytes: number | null
  received_via: StudentDocumentSource
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

export const STUDENT_DOCUMENT_TYPE_OPTIONS: { value: StudentDocumentType; label: string }[] = [
  { value: 'SAUDE', label: 'Saúde / laudo' },
  { value: 'ATESTADO', label: 'Atestado médico' },
  { value: 'CONTRATO', label: 'Contrato / termo' },
  { value: 'OUTRO', label: 'Outro' },
]

export const STUDENT_DOCUMENT_SOURCE_OPTIONS: { value: StudentDocumentSource; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'OUTRO', label: 'Outro' },
]

export function formatStudentDocumentType(type: StudentDocumentType): string {
  return STUDENT_DOCUMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type
}

export function formatStudentDocumentSource(source: StudentDocumentSource): string {
  return STUDENT_DOCUMENT_SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source
}

export function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
