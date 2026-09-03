export interface BodyMetricRow {
  id: string
  measured_at: string
  weight_kg: number | null
  height_cm: number | null
  notes: string | null
}

export function shouldRecordBodyMetric(
  prev: { weight_kg?: number | null; height_cm?: number | null },
  next: { weight_kg?: number | null; height_cm?: number | null },
): boolean {
  const nextWeight = next.weight_kg ?? null
  const nextHeight = next.height_cm ?? null
  if (nextWeight == null && nextHeight == null) return false

  const prevWeight = prev.weight_kg ?? null
  const prevHeight = prev.height_cm ?? null

  const weightChanged = nextWeight != null && nextWeight !== prevWeight
  const heightChanged = nextHeight != null && nextHeight !== prevHeight

  return weightChanged || heightChanged
}
