export interface BodyAssessmentStatus {
  enabled: boolean
  interval_months?: number
  last_measured_on?: string
  due_on?: string
  is_due?: boolean
  has_open_cycle?: boolean
  open_cycle_id?: string
}

export function formatBodyAssessmentDueMessage(status: BodyAssessmentStatus): string | null {
  if (!status.enabled || !status.is_due) return null
  if (status.due_on) {
    return `Avaliação física pendente desde ${formatDateBR(status.due_on)}. Atualize peso e altura.`
  }
  return 'Avaliação física pendente. Atualize peso e altura.'
}

function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}
