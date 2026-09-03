export const DEFAULT_PAGE_SIZE = 10

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

export function getTotalPages(totalItems: number, pageSize: number): number {
  if (totalItems <= 0) return 1
  return Math.ceil(totalItems / pageSize)
}

export function getPageSlice(totalItems: number, page: number, pageSize: number) {
  const totalPages = getTotalPages(totalItems, pageSize)
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  return {
    page: safePage,
    totalPages,
    startIndex,
    endIndex,
    from: totalItems === 0 ? 0 : startIndex + 1,
    to: endIndex,
  }
}

/** Retorna números de página com reticências para listas longas. */
export function getVisiblePageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 0) return []
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set<number>([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('ellipsis')
    result.push(sorted[i])
  }
  return result
}
