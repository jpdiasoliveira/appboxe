export type ScheduleSessionType = 'GROUP' | 'INDIVIDUAL' | 'EVENT'

export type ScheduleEventKind = 'CLASS' | 'SPARRING' | 'CHAMPIONSHIP' | 'SEMINAR' | 'OTHER'

export type ScheduleSessionStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'

export interface WeeklyRecurrence {
  frequency: 'weekly'
  daysOfWeek: number[]
  until: string
}

export interface ClassSessionRow {
  id: string
  academy_id: string
  series_id: string | null
  session_type: ScheduleSessionType
  event_kind: ScheduleEventKind
  category_id: string | null
  class_group_id: string | null
  student_id: string | null
  instructor_user_id: string | null
  title: string
  notes: string | null
  lesson_description: string | null
  visible_to_student: boolean
  color: string
  starts_at: string
  ends_at: string
  is_makeup: boolean
  status: ScheduleSessionStatus
}

export interface CreateClassSessionInput {
  academyId: string
  sessionType: ScheduleSessionType
  eventKind: ScheduleEventKind
  title: string
  notes?: string
  lessonDescription?: string
  visibleToStudent?: boolean
  color: string
  categoryId?: string
  classGroupId?: string
  studentId?: string
  instructorUserId?: string
  date: string
  timeStart: string
  timeEnd: string
  repeatWeekly?: boolean
  daysOfWeek?: number[]
  repeatUntil?: string
}

export const EVENT_KIND_LABELS: Record<ScheduleEventKind, string> = {
  CLASS: 'Aula',
  SPARRING: 'Sparring',
  CHAMPIONSHIP: 'Campeonato',
  SEMINAR: 'Seminário',
  OTHER: 'Outro',
}

export const SESSION_TYPE_LABELS: Record<ScheduleSessionType, string> = {
  GROUP: 'Turma (grupo)',
  INDIVIDUAL: 'Aula individual',
  EVENT: 'Evento',
}

export const EVENT_COLOR_PRESETS: Record<ScheduleEventKind, string> = {
  CLASS: '#B91C1C',
  SPARRING: '#EA580C',
  CHAMPIONSHIP: '#7C3AED',
  SEMINAR: '#0891B2',
  OTHER: '#64748B',
}
