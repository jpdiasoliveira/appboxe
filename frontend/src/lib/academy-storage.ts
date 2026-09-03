import { supabase } from './supabase'

export type AcademyStorageBucket = 'academy-logos' | 'landing-assets'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_BYTES: Record<AcademyStorageBucket, number> = {
  'academy-logos': 5 * 1024 * 1024,
  'landing-assets': 10 * 1024 * 1024,
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  const fromType = file.type.split('/')[1]
  if (fromType === 'jpeg') return 'jpg'
  if (fromType && ['png', 'webp', 'gif', 'jpg'].includes(fromType)) return fromType
  return 'jpg'
}

function buildObjectPath(
  academyId: string,
  folder: string | undefined,
  filename: string,
): string {
  if (folder) return `${academyId}/${folder}/${filename}`
  return `${academyId}/${filename}`
}

export function getAcademyImagePublicUrl(bucket: AcademyStorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function uploadAcademyImage(
  academyId: string,
  bucket: AcademyStorageBucket,
  file: File,
  options: {
    folder?: string
    filename?: string
    upsert?: boolean
  } = {},
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato não suportado. Use JPG, PNG, WebP ou GIF.')
  }

  const maxBytes = MAX_BYTES[bucket]
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    throw new Error(`Arquivo muito grande. Máximo ${maxMb} MB.`)
  }

  const ext = extensionFromFile(file)
  const filename = options.filename ?? `${Date.now()}.${ext}`
  const path = buildObjectPath(academyId, options.folder, filename)

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: options.upsert ?? false,
    contentType: file.type,
  })

  if (error) throw error

  return getAcademyImagePublicUrl(bucket, path)
}

export async function uploadAcademyLogo(academyId: string, file: File): Promise<string> {
  const ext = extensionFromFile(file)
  return uploadAcademyImage(academyId, 'academy-logos', file, {
    filename: `logo.${ext}`,
    upsert: true,
  })
}

export async function uploadLandingImage(
  academyId: string,
  file: File,
  purpose: string,
): Promise<string> {
  const ext = extensionFromFile(file)
  const safePurpose = purpose.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  return uploadAcademyImage(academyId, 'landing-assets', file, {
    folder: 'landing',
    filename: `${safePurpose}-${Date.now()}.${ext}`,
  })
}
