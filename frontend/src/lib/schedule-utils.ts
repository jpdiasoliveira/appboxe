import type { WeeklyRecurrence } from './schedule-types'

export interface SessionOccurrence {
  date: string
  timeStart: string
  timeEnd: string
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function buildDateTimeIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm, 0).toISOString()
}

export function expandWeeklyOccurrences(
  startDate: string,
  timeStart: string,
  timeEnd: string,
  pattern: WeeklyRecurrence,
  maxOccurrences = 90,
): SessionOccurrence[] {
  const days = new Set(pattern.daysOfWeek)
  if (days.size === 0) {
    return [{ date: startDate, timeStart, timeEnd }]
  }

  const until = parseLocalDate(pattern.until)
  const cursor = parseLocalDate(startDate)
  const results: SessionOccurrence[] = []

  while (cursor <= until && results.length < maxOccurrences) {
    if (days.has(cursor.getDay())) {
      results.push({
        date: toIsoDate(cursor),
        timeStart,
        timeEnd,
      })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return results.length > 0 ? results : [{ date: startDate, timeStart, timeEnd }]
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(weekStart)} — ${fmt(weekEnd)}`
}

export function formatSessionTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${start.toLocaleTimeString('pt-BR', opts)} – ${end.toLocaleTimeString('pt-BR', opts)}`
}

export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export interface CalendarDayCell {
  date: Date
  inMonth: boolean
  key: string
}

export function getMonthCalendarDays(monthAnchor: Date): CalendarDayCell[] {
  const gridStart = startOfWeek(startOfMonth(monthAnchor))
  const cells: CalendarDayCell[] = []
  let cursor = new Date(gridStart)

  for (let i = 0; i < 42; i += 1) {
    cells.push({
      date: new Date(cursor),
      inMonth: cursor.getMonth() === monthAnchor.getMonth(),
      key: dateKey(cursor),
    })
    cursor = addDays(cursor, 1)
  }

  return cells
}
