import { supabase } from './supabase'

const BUCKET = 'student-documents' as const
const MAX_BYTES = 10 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return base.slice(0, 120) || 'documento'
}

function buildObjectPath(academyId: string, studentId: string, filename: string): string {
  return `${academyId}/${studentId}/${filename}`
}

export function validateStudentDocumentFile(file: File): void {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Formato não suportado. Use PDF, JPG, PNG ou WebP.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 10 MB.')
  }
}

export async function uploadStudentDocumentFile(
  academyId: string,
  studentId: string,
  file: File,
): Promise<{ path: string; mimeType: string; size: number }> {
  validateStudentDocumentFile(file)

  const filename = `${Date.now()}-${sanitizeFilename(file.name)}`
  const path = buildObjectPath(academyId, studentId, filename)

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) throw error

  return { path, mimeType: file.type, size: file.size }
}

export async function getStudentDocumentSignedUrl(
  filePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Não foi possível gerar link do arquivo.')
  return data.signedUrl
}

export async function deleteStudentDocumentFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) throw error
}
