/** Data ISO (YYYY-MM-DD) → pt-BR (dd/mm/aaaa), sem shift de fuso. */

export function formatDateBR(date: string | null | undefined, fallback = '—'): string {
  if (!date?.trim()) return fallback
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim())
  if (!match) return date
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
