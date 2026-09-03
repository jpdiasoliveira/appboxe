import { supabase } from './supabase'
import type { BodyAssessmentStatus } from './body-assessment-types'

export async function fetchBodyAssessmentStatus(studentId: string): Promise<BodyAssessmentStatus> {
  const { data, error } = await supabase.rpc('get_body_assessment_status', {
    p_student_id: studentId,
  })

  if (error) throw error
  if (!data || typeof data !== 'object') {
    return { enabled: false }
  }

  const raw = data as Record<string, unknown>
  return {
    enabled: raw.enabled === true,
    interval_months: typeof raw.interval_months === 'number' ? raw.interval_months : undefined,
    last_measured_on: typeof raw.last_measured_on === 'string' ? raw.last_measured_on : undefined,
    due_on: typeof raw.due_on === 'string' ? raw.due_on : undefined,
    is_due: raw.is_due === true,
    has_open_cycle: raw.has_open_cycle === true,
    open_cycle_id: typeof raw.open_cycle_id === 'string' ? raw.open_cycle_id : undefined,
  }
}
