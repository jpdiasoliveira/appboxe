import { supabase } from '../../lib/supabase'
import type {
  AttendanceQrSessionRow,
  CreateAttendanceQrSessionResult,
} from '../../lib/attendance-qr-types'

export async function createAttendanceQrSession(input: {
  trainingCategoryId: string
  classDate: string
  classGroupId?: string
  ttlMinutes?: number
}): Promise<CreateAttendanceQrSessionResult> {
  const { data, error } = await supabase.rpc('create_attendance_qr_session', {
    p_training_category_id: input.trainingCategoryId,
    p_class_date: input.classDate,
    p_class_group_id: input.classGroupId ?? null,
    p_ttl_minutes: input.ttlMinutes ?? 120,
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Não foi possível gerar o QR')

  return {
    sessionId: row.session_id as string,
    token: row.token as string,
    expiresAt: row.expires_at as string,
  }
}

export async function redeemAttendanceQrCheckin(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_attendance_qr_checkin', {
    p_token: token,
  })
  if (error) throw error
  return data as string
}

export async function fetchActiveAttendanceQrSession(input: {
  academyId: string
  trainingCategoryId: string
  classDate: string
  classGroupId?: string
}): Promise<AttendanceQrSessionRow | null> {
  let query = supabase
    .from('attendance_qr_sessions')
    .select('*')
    .eq('academy_id', input.academyId)
    .eq('training_category_id', input.trainingCategoryId)
    .eq('class_date', input.classDate)
    .eq('status', 'ACTIVE')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)

  if (input.classGroupId) {
    query = query.eq('class_group_id', input.classGroupId)
  } else {
    query = query.is('class_group_id', null)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as AttendanceQrSessionRow | null) ?? null
}
