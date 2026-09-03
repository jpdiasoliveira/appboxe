import { BodyMetricsChart } from '../../../components/BodyMetricsChart'
import type { BodyMetricRow } from '../../../lib/body-metrics-types'
import type { StudentAttendanceSummaryRow } from '../../../lib/academy-types'
import type { StudentHistorySummary } from '../academy-api'

interface StudentHistoryPanelProps {
  summary: StudentHistorySummary
  metrics: BodyMetricRow[]
  recentAttendance: StudentAttendanceSummaryRow[]
  loading?: boolean
}

function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR')
}

function trainingDurationLabel(startDate: string | null, enrollmentDate: string): string {
  const base = startDate ?? enrollmentDate
  if (!base) return '—'
  const start = new Date(base)
  const now = new Date()
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 1) return 'Menos de 1 mês'
  if (months < 12) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years}a ${rem}m`
}

export function StudentHistoryPanel({
  summary,
  metrics,
  recentAttendance,
  loading,
}: StudentHistoryPanelProps) {
  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Carregando histórico...</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Presenças</p>
          <p className="text-lg font-semibold">{summary.presentCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Faltas</p>
          <p className="text-lg font-semibold">{summary.absentCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Lutas</p>
          <p className="text-lg font-semibold">{summary.fightsCount}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2">
          <p className="text-[10px] uppercase text-[var(--color-text-muted)]">Tempo de treino</p>
          <p className="text-sm font-semibold leading-tight">
            {trainingDurationLabel(summary.trainingStartedAt, summary.enrollmentDate)}
          </p>
        </div>
      </div>

      <BodyMetricsChart metrics={metrics} />

      {recentAttendance.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
            Últimas chamadas
          </p>
          <ul className="space-y-1.5">
            {recentAttendance.slice(0, 5).map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
              >
                <span>
                  {formatDate(row.class_date)} · {row.category_name}
                </span>
                <span className={row.present ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}>
                  {row.present ? 'Presente' : 'Falta'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Nenhuma presença registrada ainda.</p>
      )}
    </div>
  )
}
