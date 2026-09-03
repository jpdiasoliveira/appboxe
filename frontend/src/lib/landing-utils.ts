/** URLs de fotos da galeria — uma por linha no editor. */
export function parseGalleryUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
