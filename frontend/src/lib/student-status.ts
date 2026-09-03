import type { StudentStatus } from './types'

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  ATIVO: 'Ativo',
  INADIMPLENTE: 'Inadimplente',
  INATIVO: 'Inativo',
  TRIAL: 'Experimental',
}

/** Status que participam da chamada de presença. */
export const STUDENT_ATTENDANCE_STATUSES: StudentStatus[] = ['ATIVO', 'TRIAL']

export function formatStudentStatus(status: string): string {
  return STUDENT_STATUS_LABELS[status as StudentStatus] ?? status
}

export function studentStatusVariant(
  status: string,
): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'ATIVO') return 'success'
  if (status === 'INADIMPLENTE') return 'danger'
  if (status === 'TRIAL') return 'warning'
  return 'muted'
}

export const STUDENT_STATUS_SELECT_OPTIONS: { value: StudentStatus; label: string }[] = (
  Object.keys(STUDENT_STATUS_LABELS) as StudentStatus[]
).map((value) => ({
  value,
  label: STUDENT_STATUS_LABELS[value],
}))
