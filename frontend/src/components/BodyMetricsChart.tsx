import type { BodyMetricRow } from '../lib/body-metrics-types'

interface BodyMetricsChartProps {
  metrics: BodyMetricRow[]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function buildWeightPath(metrics: BodyMetricRow[], width: number, height: number, padding: number): string | null {
  const points = metrics.filter((m) => m.weight_kg != null)
  if (points.length === 0) return null

  const weights = points.map((p) => p.weight_kg as number)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const innerW = width - padding * 2
  const innerH = height - padding * 2

  return points
    .map((p, i) => {
      const x = padding + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
      const y = padding + innerH - (((p.weight_kg as number) - minW) / range) * innerH
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
}

export function BodyMetricsChart({ metrics }: BodyMetricsChartProps) {
  if (metrics.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Nenhuma medição registrada ainda. Ao salvar peso ou altura, o histórico aparece aqui.
      </p>
    )
  }

  const width = 320
  const height = 140
  const padding = 16
  const path = buildWeightPath(metrics, width, height, padding)
  const weightPoints = metrics.filter((m) => m.weight_kg != null)
  const latest = metrics[metrics.length - 1]
  const first = metrics[0]

  const weightDelta =
    latest.weight_kg != null && first.weight_kg != null
      ? latest.weight_kg - first.weight_kg
      : null

  return (
    <div className="space-y-4">
      {weightPoints.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <span>Evolução do peso (kg)</span>
            {weightDelta != null && metrics.length > 1 ? (
              <span className={weightDelta <= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}>
                {weightDelta > 0 ? '+' : ''}
                {weightDelta.toFixed(1)} kg
              </span>
            ) : null}
          </div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-md" role="img" aria-label="Gráfico de peso">
            {path ? (
              <path
                d={path}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {weightPoints.map((p, i) => {
              const innerW = width - padding * 2
              const x =
                padding +
                (weightPoints.length === 1 ? innerW / 2 : (i / (weightPoints.length - 1)) * innerW)
              const weights = weightPoints.map((pt) => pt.weight_kg as number)
              const minW = Math.min(...weights)
              const maxW = Math.max(...weights)
              const range = maxW - minW || 1
              const innerH = height - padding * 2
              const y = padding + innerH - (((p.weight_kg as number) - minW) / range) * innerH
              return <circle key={p.id} cx={x} cy={y} r="4" fill="var(--color-primary)" />
            })}
          </svg>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-elevated)] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Peso</th>
              <th className="px-3 py-2">Altura</th>
            </tr>
          </thead>
          <tbody>
            {[...metrics].reverse().map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text-muted)]">{formatDate(row.measured_at)}</td>
                <td className="px-3 py-2">{row.weight_kg != null ? `${row.weight_kg} kg` : '—'}</td>
                <td className="px-3 py-2">{row.height_cm != null ? `${row.height_cm} cm` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
