import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PAGE_SIZE,
  getPageSlice,
} from '../lib/pagination'

interface UsePaginationOptions {
  pageSize?: number
  /** Muda quando filtros/busca mudam — reseta para página 1. */
  resetKey?: string | number
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(options.pageSize ?? DEFAULT_PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [options.resetKey, pageSize])

  const totalItems = items.length

  const slice = useMemo(
    () => getPageSlice(totalItems, page, pageSize),
    [totalItems, page, pageSize],
  )

  useEffect(() => {
    if (page !== slice.page) setPage(slice.page)
  }, [page, slice.page])

  const paginatedItems = useMemo(
    () => items.slice(slice.startIndex, slice.endIndex),
    [items, slice.startIndex, slice.endIndex],
  )

  function changePageSize(size: number) {
    setPageSize(size)
  }

  return {
    page: slice.page,
    pageSize,
    totalItems,
    totalPages: slice.totalPages,
    from: slice.from,
    to: slice.to,
    paginatedItems,
    setPage,
    setPageSize: changePageSize,
  }
}
