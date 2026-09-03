import { describe, expect, it } from 'vitest'
import {
  computeCategoryStats,
  computeConsecutiveAbsences,
  countConsecutiveAbsences,
  type AttendanceReportRecord,
} from './attendance-report'

const base = (
  overrides: Partial<AttendanceReportRecord> & Pick<AttendanceReportRecord, 'classDate' | 'present'>,
): AttendanceReportRecord => ({
  studentId: 's1',
  studentName: 'João',
  categoryId: 'c1',
  categoryName: 'Boxe',
  ...overrides,
})

describe('computeCategoryStats', () => {
  it('calcula % por turma', () => {
    const stats = computeCategoryStats([
      base({ classDate: '2026-09-01', present: true }),
      base({ classDate: '2026-09-02', present: false }),
      base({ classDate: '2026-09-03', present: true, categoryId: 'c2', categoryName: 'Muay' }),
    ])
    expect(stats).toHaveLength(2)
    expect(stats.find((s) => s.categoryId === 'c1')?.attendancePct).toBe(50)
    expect(stats.find((s) => s.categoryId === 'c2')?.attendancePct).toBe(100)
  })
})

describe('countConsecutiveAbsences', () => {
  it('conta faltas a partir da data mais recente', () => {
    expect(
      countConsecutiveAbsences([
        { classDate: '2026-09-01', present: true },
        { classDate: '2026-09-08', present: false },
        { classDate: '2026-09-15', present: false },
      ]),
    ).toBe(2)
  })

  it('zera se última presença foi positiva', () => {
    expect(
      countConsecutiveAbsences([
        { classDate: '2026-09-01', present: false },
        { classDate: '2026-09-08', present: true },
      ]),
    ).toBe(0)
  })
})

describe('computeConsecutiveAbsences', () => {
  it('filtra por mínimo de faltas', () => {
    const rows = computeConsecutiveAbsences(
      [
        base({ classDate: '2026-09-01', present: false }),
        base({ classDate: '2026-09-08', present: false }),
      ],
      2,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].consecutiveAbsences).toBe(2)
  })
})
