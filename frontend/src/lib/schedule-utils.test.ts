import { describe, expect, it } from 'vitest'
import { expandWeeklyOccurrences, getMonthCalendarDays } from './schedule-utils'

describe('expandWeeklyOccurrences', () => {
  it('gera ocorrências semanais nos dias selecionados', () => {
    const rows = expandWeeklyOccurrences('2026-09-01', '19:00', '20:00', {
      frequency: 'weekly',
      daysOfWeek: [1, 3],
      until: '2026-09-10',
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.timeStart === '19:00')).toBe(true)
  })

  it('retorna uma ocorrência quando não há dias na recorrência', () => {
    const rows = expandWeeklyOccurrences('2026-09-01', '19:00', '20:00', {
      frequency: 'weekly',
      daysOfWeek: [],
      until: '2026-09-30',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.date).toBe('2026-09-01')
  })
})

describe('getMonthCalendarDays', () => {
  it('retorna 42 células para grade mensal', () => {
    const cells = getMonthCalendarDays(new Date(2026, 8, 1))
    expect(cells).toHaveLength(42)
    expect(cells.filter((c) => c.inMonth).length).toBe(30)
  })
})
