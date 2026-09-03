import { supabase } from '../../lib/supabase'
import {
  deleteStudentDocumentFile,
  uploadStudentDocumentFile,
} from '../../lib/student-document-storage'
import type {
  StudentDocumentRow,
  StudentDocumentSource,
  StudentDocumentType,
} from '../../lib/student-document-types'

async function logDocumentAudit(
  academyId: string,
  action: 'STUDENT_DOCUMENT_UPLOAD' | 'STUDENT_DOCUMENT_DELETE',
  documentId: string,
  metadata: Record<string, unknown>,
) {
  const { data: userData } = await supabase.auth.getUser()
  await supabase.from('audit_logs').insert({
    user_id: userData.user?.id ?? null,
    academy_id: academyId,
    action,
    entity_type: 'student_documents',
    entity_id: documentId,
    metadata,
  })
}

export async function fetchStudentDocuments(studentId: string): Promise<StudentDocumentRow[]> {
  const { data, error } = await supabase
    .from('student_documents')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as StudentDocumentRow[]
}

export async function uploadStudentDocument(input: {
  academyId: string
  studentId: string
  file: File
  title: string
  documentType: StudentDocumentType
  receivedVia: StudentDocumentSource
  notes?: string
}): Promise<StudentDocumentRow> {
  const { path, mimeType, size } = await uploadStudentDocumentFile(
    input.academyId,
    input.studentId,
    input.file,
  )

  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('student_documents')
    .insert({
      academy_id: input.academyId,
      student_id: input.studentId,
      document_type: input.documentType,
      title: input.title.trim(),
      file_path: path,
      mime_type: mimeType,
      file_size_bytes: size,
      received_via: input.receivedVia,
      notes: input.notes?.trim() || null,
      uploaded_by: userData.user?.id ?? null,
    })
    .select('*')
    .single()

  if (error) {
    await deleteStudentDocumentFile(path).catch(() => undefined)
    throw error
  }

  await logDocumentAudit(input.academyId, 'STUDENT_DOCUMENT_UPLOAD', data.id, {
    student_id: input.studentId,
    document_type: input.documentType,
    title: input.title,
    received_via: input.receivedVia,
  })

  return data as StudentDocumentRow
}

export async function deleteStudentDocument(doc: StudentDocumentRow): Promise<void> {
  const { error: dbError } = await supabase
    .from('student_documents')
    .delete()
    .eq('id', doc.id)

  if (dbError) throw dbError

  await deleteStudentDocumentFile(doc.file_path).catch(() => undefined)

  await logDocumentAudit(doc.academy_id, 'STUDENT_DOCUMENT_DELETE', doc.id, {
    student_id: doc.student_id,
    title: doc.title,
  })
}
