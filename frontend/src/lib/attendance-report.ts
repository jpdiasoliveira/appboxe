export interface AttendanceReportRecord {
  studentId: string
  studentName: string
  categoryId: string
  categoryName: string
  classDate: string
  present: boolean
}

export interface CategoryAttendanceStat {
  categoryId: string
  categoryName: string
  totalRecords: number
  presentCount: number
  attendancePct: number
}

export interface ConsecutiveAbsenceRow {
  studentId: string
  studentName: string
  categoryId: string
  categoryName: string
  consecutiveAbsences: number
  lastClassDate: string
}

function groupKey(studentId: string, categoryId: string) {
  return `${studentId}:${categoryId}`
}

export function computeCategoryStats(records: AttendanceReportRecord[]): CategoryAttendanceStat[] {
  const byCategory = new Map<
    string,
    { categoryName: string; total: number; present: number }
  >()

  for (const row of records) {
    const current = byCategory.get(row.categoryId) ?? {
      categoryName: row.categoryName,
      total: 0,
      present: 0,
    }
    current.total += 1
    if (row.present) current.present += 1
    byCategory.set(row.categoryId, current)
  }

  return [...byCategory.entries()]
    .map(([categoryId, stats]) => ({
      categoryId,
      categoryName: stats.categoryName,
      totalRecords: stats.total,
      presentCount: stats.present,
      attendancePct:
        stats.total > 0 ? Math.round((stats.present / stats.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'pt-BR'))
}

export function countConsecutiveAbsences(
  rows: { classDate: string; present: boolean }[],
): number {
  const sorted = [...rows].sort((a, b) => b.classDate.localeCompare(a.classDate))
  let count = 0
  for (const row of sorted) {
    if (row.present) break
    count += 1
  }
  return count
}

export function computeConsecutiveAbsences(
  records: AttendanceReportRecord[],
  minAbsences = 1,
): ConsecutiveAbsenceRow[] {
  const groups = new Map<
    string,
    {
      studentId: string
      studentName: string
      categoryId: string
      categoryName: string
      rows: { classDate: string; present: boolean }[]
    }
  >()

  for (const row of records) {
    const key = groupKey(row.studentId, row.categoryId)
    const group = groups.get(key) ?? {
      studentId: row.studentId,
      studentName: row.studentName,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      rows: [],
    }
    group.rows.push({ classDate: row.classDate, present: row.present })
    groups.set(key, group)
  }

  const result: ConsecutiveAbsenceRow[] = []

  for (const group of groups.values()) {
    const consecutiveAbsences = countConsecutiveAbsences(group.rows)
    if (consecutiveAbsences < minAbsences) continue
    const lastClassDate = group.rows
      .map((r) => r.classDate)
      .sort((a, b) => b.localeCompare(a))[0]
    result.push({
      studentId: group.studentId,
      studentName: group.studentName,
      categoryId: group.categoryId,
      categoryName: group.categoryName,
      consecutiveAbsences,
      lastClassDate,
    })
  }

  return result.sort((a, b) => {
    if (b.consecutiveAbsences !== a.consecutiveAbsences) {
      return b.consecutiveAbsences - a.consecutiveAbsences
    }
    return a.studentName.localeCompare(b.studentName, 'pt-BR')
  })
}

export function buildAttendanceReportCsv(
  categoryStats: CategoryAttendanceStat[],
  absenceRows: ConsecutiveAbsenceRow[],
): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []

  rows.push(['=== Frequência por turma ==='])
  rows.push(['Turma', 'Presenças', 'Total', 'Frequência %'])
  for (const row of categoryStats) {
    rows.push([
      row.categoryName,
      String(row.presentCount),
      String(row.totalRecords),
      `${row.attendancePct.toFixed(1)}%`,
    ])
  }

  rows.push([])
  rows.push(['=== Faltas consecutivas ==='])
  rows.push(['Aluno', 'Turma', 'Faltas seguidas', 'Última chamada'])
  for (const row of absenceRows) {
    rows.push([
      row.studentName,
      row.categoryName,
      String(row.consecutiveAbsences),
      new Date(`${row.lastClassDate}T12:00:00`).toLocaleDateString('pt-BR'),
    ])
  }

  return {
    headers: [],
    rows,
  }
}
