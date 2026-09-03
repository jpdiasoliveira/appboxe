import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { getVisiblePageNumbers, PAGE_SIZE_OPTIONS } from '../../lib/pagination'

export interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  from: number
  to: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalItems === 0) return null

  const pages = getVisiblePageNumbers(page, totalPages)
  const showControls = totalPages > 1 || onPageSizeChange

  if (!showControls) {
    return (
      <div className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        {totalItems === 1 ? '1 item' : `${totalItems} itens`}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:px-4">
      <p className="text-center text-[var(--color-text-muted)] sm:text-left">
        Mostrando{' '}
        <span className="font-medium text-[var(--color-text)]">
          {from}–{to}
        </span>{' '}
        de <span className="font-medium text-[var(--color-text)]">{totalItems}</span>
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        {onPageSizeChange ? (
          <label className="flex w-full items-center justify-center gap-2 text-[var(--color-text-muted)] sm:w-auto sm:justify-start">
            <span className="text-xs sm:text-sm">Por página</span>
            <select
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1.5 text-sm text-[var(--color-text)]"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Itens por página"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {totalPages > 1 ? (
          <nav className="flex w-full items-center justify-center gap-1 sm:w-auto" aria-label="Paginação">
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Anterior</span>
            </button>

            <div className="hidden items-center gap-1 sm:flex">
              {pages.map((item, index) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 text-[var(--color-text-muted)]"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`min-w-9 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                      item === page
                        ? 'bg-[var(--color-primary)] font-semibold text-white'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]'
                    }`}
                    aria-current={item === page ? 'page' : undefined}
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>

            <span className="px-2 text-sm text-[var(--color-text-muted)] sm:hidden">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  )
}
