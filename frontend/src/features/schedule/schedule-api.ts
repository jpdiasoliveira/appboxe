import { supabase } from '../../lib/supabase'
import {
  buildDateTimeIso,
  expandWeeklyOccurrences,
} from '../../lib/schedule-utils'
import type { ClassSessionRow, CreateClassSessionInput } from '../../lib/schedule-types'

export async function fetchAcademyClassSessions(
  academyId: string,
  from: string,
  to: string,
): Promise<ClassSessionRow[]> {
  const { data, error } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('academy_id', academyId)
    .eq('status', 'SCHEDULED')
    .gte('starts_at', from)
    .lt('starts_at', to)
    .order('starts_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as ClassSessionRow[]
}

export async function fetchStudentClassSessions(from: string, to: string): Promise<ClassSessionRow[]> {
  const { data, error } = await supabase.rpc('get_student_class_sessions', {
    p_from: from,
    p_to: to,
  })
  if (error) throw error
  return (data ?? []) as ClassSessionRow[]
}

export async function cancelClassSession(sessionId: string) {
  const { error } = await supabase
    .from('class_sessions')
    .update({ status: 'CANCELLED' })
    .eq('id', sessionId)
  if (error) throw error
}

export async function updateClassSessionPlan(
  sessionId: string,
  input: {
    title?: string
    lessonDescription?: string | null
    visibleToStudent?: boolean
    notes?: string | null
  },
) {
  const row: Record<string, unknown> = {}
  if (input.title !== undefined) row.title = input.title
  if (input.lessonDescription !== undefined) row.lesson_description = input.lessonDescription
  if (input.visibleToStudent !== undefined) row.visible_to_student = input.visibleToStudent
  if (input.notes !== undefined) row.notes = input.notes

  const { error } = await supabase.from('class_sessions').update(row).eq('id', sessionId)
  if (error) throw error
}

export async function createClassSessions(input: CreateClassSessionInput) {
  const {
    academyId,
    sessionType,
    eventKind,
    title,
    notes,
    lessonDescription,
    visibleToStudent = true,
    color,
    categoryId,
    classGroupId,
    studentId,
    instructorUserId,
    date,
    timeStart,
    timeEnd,
    repeatWeekly,
    daysOfWeek,
    repeatUntil,
  } = input

  const { data: auth } = await supabase.auth.getUser()
  const createdBy = auth.user?.id ?? null
  const instructorId = instructorUserId ?? createdBy

  const occurrences =
    repeatWeekly && repeatUntil && daysOfWeek && daysOfWeek.length > 0
      ? expandWeeklyOccurrences(date, timeStart, timeEnd, {
          frequency: 'weekly',
          daysOfWeek,
          until: repeatUntil,
        })
      : [{ date, timeStart, timeEnd }]

  let seriesId: string | null = null

  if (occurrences.length > 1) {
    const { data: series, error: seriesError } = await supabase
      .from('schedule_series')
      .insert({
        academy_id: academyId,
        created_by: createdBy,
        session_type: sessionType,
        event_kind: eventKind,
        category_id: categoryId ?? null,
        class_group_id: classGroupId ?? null,
        student_id: studentId ?? null,
        instructor_user_id: instructorId,
        title,
        notes: notes ?? null,
        lesson_description: lessonDescription?.trim() || null,
        visible_to_student: visibleToStudent,
        color,
        recurrence: {
          frequency: 'weekly',
          daysOfWeek,
          until: repeatUntil,
          timeStart,
          timeEnd,
        },
      })
      .select('id')
      .single()

    if (seriesError) throw seriesError
    seriesId = series.id
  }

  const rows = occurrences.map((occ) => ({
    academy_id: academyId,
    series_id: seriesId,
    created_by: createdBy,
    session_type: sessionType,
    event_kind: eventKind,
    category_id: categoryId ?? null,
    class_group_id: classGroupId ?? null,
    student_id: studentId ?? null,
    instructor_user_id: instructorId,
    title,
    notes: notes ?? null,
    lesson_description: lessonDescription?.trim() || null,
    visible_to_student: visibleToStudent,
    color,
    starts_at: buildDateTimeIso(occ.date, occ.timeStart),
    ends_at: buildDateTimeIso(occ.date, occ.timeEnd),
    status: 'SCHEDULED',
  }))

  const { data, error } = await supabase.from('class_sessions').insert(rows).select('id')
  if (error) throw error
  return { created: data?.length ?? 0, seriesId }
}
