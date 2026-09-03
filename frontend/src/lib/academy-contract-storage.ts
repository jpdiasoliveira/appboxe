import { supabase } from './supabase'

const BUCKET = 'academy-documents' as const
const MAX_BYTES = 10 * 1024 * 1024

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return base.slice(0, 120) || 'contrato.pdf'
}

export function validateAcademyContractFile(file: File): void {
  if (file.type !== 'application/pdf') {
    throw new Error('Envie um arquivo PDF.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Arquivo muito grande. Máximo 10 MB.')
  }
}

export function buildAcademyContractPath(academyId: string, filename: string): string {
  return `${academyId}/${filename}`
}

export async function uploadAcademyContractFile(
  academyId: string,
  file: File,
): Promise<{ path: string; mimeType: string; size: number; originalFilename: string }> {
  validateAcademyContractFile(file)

  const filename = `contract-${Date.now()}-${sanitizeFilename(file.name)}`
  const path = buildAcademyContractPath(academyId, filename)

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) throw error

  return {
    path,
    mimeType: file.type,
    size: file.size,
    originalFilename: file.name,
  }
}

export async function getAcademyContractSignedUrl(
  filePath: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresInSeconds)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Não foi possível gerar link do contrato.')
  return data.signedUrl
}

export async function deleteAcademyContractFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath])
  if (error) throw error
}
