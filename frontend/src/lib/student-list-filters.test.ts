import { describe, expect, it } from 'vitest'
import {
  applyStudentListFilters,
  countActiveStudentFilters,
  EMPTY_STUDENT_LIST_FILTERS,
} from './student-list-filters'
import type { StudentListRow } from './academy-types'

function row(partial: Partial<StudentListRow> & { id: string }): StudentListRow {
  return {
    user_id: 'u1',
    academy_id: 'a1',
    cpf: null,
    phone: null,
    status: 'ATIVO',
    enrollment_date: '2026-01-01',
    plan_id: null,
    plan_name: null,
    category_ids: [],
    profile: { name: partial.id },
    ...partial,
  }
}

describe('student-list-filters', () => {
  const rows = [
    row({ id: 'A', status: 'INADIMPLENTE', plan_id: 'p1', category_ids: ['c1'] }),
    row({ id: 'B', status: 'ATIVO', plan_id: 'p2', category_ids: ['c2'] }),
  ]

  it('filtra por status', () => {
    const result = applyStudentListFilters(rows, {
      ...EMPTY_STUDENT_LIST_FILTERS,
      status: 'INADIMPLENTE',
    })
    expect(result.map((r) => r.id)).toEqual(['A'])
  })

  it('filtra por plano e categoria', () => {
    const result = applyStudentListFilters(rows, {
      ...EMPTY_STUDENT_LIST_FILTERS,
      planId: 'p2',
      categoryId: 'c2',
    })
    expect(result.map((r) => r.id)).toEqual(['B'])
  })

  it('conta filtros ativos', () => {
    expect(countActiveStudentFilters(EMPTY_STUDENT_LIST_FILTERS)).toBe(0)
    expect(
      countActiveStudentFilters({
        status: 'ATIVO',
        planId: 'p1',
        categoryId: '',
        onlyInadimplente: true,
      }),
    ).toBe(3)
  })
})
