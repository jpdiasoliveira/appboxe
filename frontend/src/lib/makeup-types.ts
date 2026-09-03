export type ClassMakeupStatus = 'DISPONIVEL' | 'USADO' | 'EXPIRADO' | 'CANCELADO'

export interface ClassMakeupCreditRow {
  id: string
  academy_id: string
  student_id: string
  training_category_id: string
  source_attendance_id: string | null
  source_session_id: string | null
  status: ClassMakeupStatus
  expires_at: string
  granted_by: string | null
  notes: string | null
  created_at: string
  training_category?: { name: string } | { name: string }[] | null
  redemption?: {
    class_session_id: string
    redeemed_at: string
    class_session?: { starts_at: string; title: string } | { starts_at: string; title: string }[] | null
  } | null
}

export interface MakeupCreditStats {
  disponivel: number
  usado: number
  expirado: number
  cancelado: number
}

export const MAKEUP_STATUS_LABELS: Record<ClassMakeupStatus, string> = {
  DISPONIVEL: 'Disponível',
  USADO: 'Usado',
  EXPIRADO: 'Expirado',
  CANCELADO: 'Cancelado',
}

export function makeupStatusVariant(
  status: ClassMakeupStatus,
): 'success' | 'warning' | 'danger' | 'muted' {
  if (status === 'DISPONIVEL') return 'success'
  if (status === 'USADO') return 'muted'
  if (status === 'EXPIRADO') return 'danger'
  return 'warning'
}
