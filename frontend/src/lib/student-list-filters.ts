import type { StudentStatus } from './types'
import type { StudentListRow } from './academy-types'

export interface StudentListFilters {
  status: StudentStatus | 'TODOS'
  planId: string
  categoryId: string
  onlyInadimplente: boolean
}

export const EMPTY_STUDENT_LIST_FILTERS: StudentListFilters = {
  status: 'TODOS',
  planId: '',
  categoryId: '',
  onlyInadimplente: false,
}

export function countActiveStudentFilters(filters: StudentListFilters): number {
  let n = 0
  if (filters.status !== 'TODOS') n += 1
  if (filters.planId) n += 1
  if (filters.categoryId) n += 1
  if (filters.onlyInadimplente) n += 1
  return n
}

export function applyStudentListFilters(
  rows: StudentListRow[],
  filters: StudentListFilters,
): StudentListRow[] {
  return rows.filter((row) => {
    if (filters.onlyInadimplente && row.status !== 'INADIMPLENTE') return false
    if (filters.status !== 'TODOS' && row.status !== filters.status) return false
    if (filters.planId && row.plan_id !== filters.planId) return false
    if (filters.categoryId && !row.category_ids.includes(filters.categoryId)) return false
    return true
  })
}
