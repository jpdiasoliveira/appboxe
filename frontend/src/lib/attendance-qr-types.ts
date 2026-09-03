export type AttendanceQrStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED'

export interface AttendanceQrSessionRow {
  id: string
  academy_id: string
  training_category_id: string
  class_group_id: string | null
  class_date: string
  token: string
  expires_at: string
  status: AttendanceQrStatus
  created_at: string
}

export interface CreateAttendanceQrSessionResult {
  sessionId: string
  token: string
  expiresAt: string
}

export function buildStudentCheckInUrl(token: string): string {
  if (typeof window === 'undefined') return `/student/check-in/${token}`
  return `${window.location.origin}/student/check-in/${token}`
}
