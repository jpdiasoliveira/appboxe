export type ClassGroupStatus = 'ATIVO' | 'INATIVO' | 'SUSPENSO'

export interface ClassGroupRow {
  id: string
  academy_id: string
  training_category_id: string
  branch_id: string | null
  instructor_user_id: string | null
  name: string
  description: string | null
  max_students: number
  status: ClassGroupStatus
  schedule_hint: Record<string, unknown>
  created_at: string
  updated_at: string
  training_category?: { name: string; color?: string | null } | { name: string; color?: string | null }[] | null
  member_count?: number
}

export interface ClassGroupMemberRow {
  id: string
  class_group_id: string
  student_id: string
  joined_at: string
  student?: {
    id: string
    profile?: { name: string } | { name: string }[] | null
  } | null
}

export const CLASS_GROUP_STATUS_LABELS: Record<ClassGroupStatus, string> = {
  ATIVO: 'Ativa',
  INATIVO: 'Inativa',
  SUSPENSO: 'Suspensa',
}

export function formatScheduleHint(hint: Record<string, unknown> | null | undefined): string {
  if (!hint || typeof hint !== 'object') return '—'
  const days = Array.isArray(hint.days) ? (hint.days as string[]) : []
  const time = typeof hint.time === 'string' ? hint.time : null
  if (days.length === 0 && !time) return '—'
  const dayLabels: Record<string, string> = {
    MON: 'Seg',
    TUE: 'Ter',
    WED: 'Qua',
    THU: 'Qui',
    FRI: 'Sex',
    SAT: 'Sáb',
    SUN: 'Dom',
  }
  const daysText = days.map((d) => dayLabels[d] ?? d).join(', ')
  return time ? `${daysText} · ${time}` : daysText
}
