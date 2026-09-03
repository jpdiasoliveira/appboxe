import { supabase } from './supabase'
import type { BodyMetricRow } from './body-metrics-types'

export async function fetchBodyMetrics(studentId: string): Promise<BodyMetricRow[]> {
  const { data, error } = await supabase
    .from('student_body_metrics')
    .select('id, measured_at, weight_kg, height_cm, notes')
    .eq('student_id', studentId)
    .order('measured_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    measured_at: row.measured_at,
    weight_kg: row.weight_kg != null ? Number(row.weight_kg) : null,
    height_cm: row.height_cm != null ? Number(row.height_cm) : null,
    notes: row.notes,
  }))
}

export async function appendBodyMetric(input: {
  studentId: string
  academyId: string
  weight_kg?: number | null
  height_cm?: number | null
  notes?: string | null
}) {
  if (input.weight_kg == null && input.height_cm == null) return

  const { data: user } = await supabase.auth.getUser()

  const { error } = await supabase.from('student_body_metrics').insert({
    student_id: input.studentId,
    academy_id: input.academyId,
    weight_kg: input.weight_kg ?? null,
    height_cm: input.height_cm ?? null,
    notes: input.notes ?? null,
    recorded_by: user.user?.id ?? null,
  })

  if (error) throw error
}
