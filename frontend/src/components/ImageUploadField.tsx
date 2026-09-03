import { useId, useRef, useState } from 'react'
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Label } from './ui/Label'
import { Input } from './ui/Input'
import { uploadAcademyLogo, uploadLandingImage } from '../lib/academy-storage'

type ImageAspect = 'square' | 'video' | 'banner'

interface ImageUploadFieldProps {
  label: string
  hint?: string
  value: string
  onChange: (url: string) => void
  academyId: string
  /** 'logo' usa bucket academy-logos; 'landing' usa landing-assets */
  uploadKind: 'logo' | 'landing'
  landingPurpose?: string
  aspect?: ImageAspect
  showUrlFallback?: boolean
  disabled?: boolean
}

const ASPECT_CLASS: Record<ImageAspect, string> = {
  square: 'aspect-square max-w-[140px]',
  video: 'aspect-video max-w-xs',
  banner: 'aspect-[21/9] max-w-md',
}

export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  academyId,
  uploadKind,
  landingPurpose = 'image',
  aspect = 'video',
  showUrlFallback = true,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file || !academyId) return
    setError(null)
    setUploading(true)
    try {
      const url =
        uploadKind === 'logo'
          ? await uploadAcademyLogo(academyId, file)
          : await uploadLandingImage(academyId, file, landingPurpose)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const hasImage = Boolean(value?.trim())

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>

      <div className="mt-2 flex flex-wrap items-start gap-4">
        <button
          type="button"
          disabled={disabled || uploading || !academyId}
          onClick={() => fileRef.current?.click()}
          className={`group relative flex w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-elevated)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60 ${ASPECT_CLASS[aspect]}`}
          aria-label={hasImage ? 'Trocar imagem' : 'Adicionar imagem'}
        >
          {hasImage ? (
            <>
              <img
                src={value}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <PhotoIcon className="h-8 w-8 text-white" aria-hidden />
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-2 p-4 text-center">
              <PhotoIcon
                className="h-10 w-10 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]"
                aria-hidden
              />
              <span className="text-xs text-[var(--color-text-muted)]">
                {uploading ? 'Enviando…' : 'Clique para adicionar foto'}
              </span>
            </span>
          )}
        </button>

        {hasImage ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
            Remover
          </button>
        ) : null}
      </div>

      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}

      {showUrlFallback ? (
        <div className="mt-3">
          <Label className="text-xs font-normal text-[var(--color-text-muted)]">
            Ou cole um link
          </Label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://exemplo.com/foto.jpg"
            disabled={disabled}
            className="mt-1"
          />
        </div>
      ) : null}
    </div>
  )
}

interface GalleryImagesUploadProps {
  label: string
  hint?: string
  value: string
  onChange: (urls: string) => void
  academyId: string
  disabled?: boolean
}

function parseGalleryUrls(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function GalleryImagesUpload({
  label,
  hint,
  value,
  onChange,
  academyId,
  disabled = false,
}: GalleryImagesUploadProps) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const urls = parseGalleryUrls(value)

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !academyId) return
    setError(null)
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadLandingImage(academyId, file, 'gallery')
        uploaded.push(url)
      }
      const merged = [...urls, ...uploaded]
      onChange(merged.join('\n'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeAt(index: number) {
    const next = urls.filter((_, i) => i !== index)
    onChange(next.join('\n'))
  }

  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>

      <div className="mt-2 flex flex-wrap gap-3">
        {urls.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative aspect-square w-24 overflow-hidden rounded-lg border border-[var(--color-border)]"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remover foto"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ))}

        <button
          type="button"
          disabled={disabled || uploading || !academyId}
          onClick={() => fileRef.current?.click()}
          className="flex aspect-square w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-60"
        >
          <PhotoIcon className="h-7 w-7" aria-hidden />
          <span className="px-1 text-center text-[10px] leading-tight">
            {uploading ? 'Enviando…' : 'Adicionar'}
          </span>
        </button>
      </div>

      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p> : null}

      <div className="mt-3">
        <Label className="text-xs font-normal text-[var(--color-text-muted)]">
          Ou cole links (um por linha)
        </Label>
        <textarea
          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={'https://exemplo.com/foto1.jpg\nhttps://exemplo.com/foto2.jpg'}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
