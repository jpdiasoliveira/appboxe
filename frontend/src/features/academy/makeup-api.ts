import { supabase } from '../../lib/supabase'
import type { ClassMakeupCreditRow, MakeupCreditStats, ClassMakeupStatus } from '../../lib/makeup-types'

export async function fetchStudentMakeupCredits(studentId: string): Promise<ClassMakeupCreditRow[]> {
  const { data, error } = await supabase
    .from('class_makeup_credits')
    .select(
      `
      *,
      training_categories(name),
      class_makeup_redemptions(
        class_session_id,
        redeemed_at,
        class_sessions(starts_at, title)
      )
    `,
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const redemption = Array.isArray(raw.class_makeup_redemptions)
      ? raw.class_makeup_redemptions[0]
      : raw.class_makeup_redemptions
    const redemptionObj = redemption as Record<string, unknown> | null | undefined
  return {
      ...(row as Omit<ClassMakeupCreditRow, 'training_category' | 'redemption'>),
      training_category: raw.training_categories as ClassMakeupCreditRow['training_category'],
      redemption: redemptionObj
        ? {
            class_session_id: redemptionObj.class_session_id as string,
            redeemed_at: redemptionObj.redeemed_at as string,
            class_session: redemptionObj.class_sessions as ClassMakeupCreditRow['redemption'] extends {
              class_session?: infer S
            }
              ? S
              : never,
          }
        : null,
    } satisfies ClassMakeupCreditRow
  })
}

export async function grantMakeupCredit(input: {
  studentId: string
  trainingCategoryId: string
  notes?: string
  sourceAttendanceId?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('grant_class_makeup_credit', {
    p_student_id: input.studentId,
    p_training_category_id: input.trainingCategoryId,
    p_notes: input.notes ?? null,
    p_source_attendance_id: input.sourceAttendanceId ?? null,
  })

  if (error) throw error
  return data as string
}

export async function redeemMakeupCredit(input: {
  creditId: string
  sessionDate: string
  timeStart: string
  timeEnd: string
  title?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_class_makeup_credit', {
    p_credit_id: input.creditId,
    p_session_date: input.sessionDate,
    p_time_start: input.timeStart,
    p_time_end: input.timeEnd,
    p_title: input.title ?? 'Reposição',
  })

  if (error) throw error
  return data as string
}

export async function cancelMakeupCredit(creditId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_class_makeup_credit', {
    p_credit_id: creditId,
  })
  if (error) throw error
}

export async function fetchAcademyMakeupStats(academyId: string): Promise<MakeupCreditStats> {
  const { data, error } = await supabase
    .from('class_makeup_credits')
    .select('status')
    .eq('academy_id', academyId)

  if (error) throw error

  const stats: MakeupCreditStats = {
    disponivel: 0,
    usado: 0,
    expirado: 0,
    cancelado: 0,
  }

  for (const row of data ?? []) {
    const status = row.status as ClassMakeupStatus
    if (status === 'DISPONIVEL') stats.disponivel += 1
    else if (status === 'USADO') stats.usado += 1
    else if (status === 'EXPIRADO') stats.expirado += 1
    else if (status === 'CANCELADO') stats.cancelado += 1
  }

  return stats
}
