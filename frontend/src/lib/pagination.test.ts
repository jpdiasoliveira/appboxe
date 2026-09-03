import { describe, expect, it } from 'vitest'
import { getPageSlice, getTotalPages, getVisiblePageNumbers } from './pagination'

describe('getTotalPages', () => {
  it('returns 1 for empty lists', () => {
    expect(getTotalPages(0, 10)).toBe(1)
  })

  it('ceil divides items by page size', () => {
    expect(getTotalPages(25, 10)).toBe(3)
  })
})

describe('getPageSlice', () => {
  it('clamps page and computes range', () => {
    expect(getPageSlice(25, 2, 10)).toEqual({
      page: 2,
      totalPages: 3,
      startIndex: 10,
      endIndex: 20,
      from: 11,
      to: 20,
    })
  })

  it('clamps page above total', () => {
    expect(getPageSlice(5, 99, 10).page).toBe(1)
  })
})

describe('getVisiblePageNumbers', () => {
  it('returns all pages when total is small', () => {
    expect(getVisiblePageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('inserts ellipsis for long lists', () => {
    expect(getVisiblePageNumbers(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
  })
})
