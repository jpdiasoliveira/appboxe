import type { AcademyChartData, ChartMonthPoint } from '../lib/academy-types'

interface BarChartProps {
  title: string
  subtitle?: string
  points: ChartMonthPoint[]
  valueFormatter?: (value: number) => string
  accent?: 'primary' | 'warning' | 'success'
}

const ACCENT_CLASS = {
  primary: 'bg-[var(--color-primary)]',
  warning: 'bg-[var(--color-warning)]',
  success: 'bg-[var(--color-success)]',
} as const

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function defaultFormatter(value: number): string {
  return String(value)
}

function BarChart({ title, subtitle, points, valueFormatter = defaultFormatter, accent = 'primary' }: BarChartProps) {
  const max = Math.max(...points.map((p) => p.value), 1)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</p> : null}
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Sem dados no período.</p>
      ) : (
        <div className="flex h-40 items-end gap-2">
          {points.map((point) => {
            const heightPct = Math.max((point.value / max) * 100, point.value > 0 ? 8 : 0)
            return (
              <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-medium text-[var(--color-text-muted)]">
                  {valueFormatter(point.value)}
                </span>
                <div className="flex h-28 w-full items-end justify-center">
                  <div
                    className={`w-full max-w-10 rounded-t-md ${ACCENT_CLASS[accent]} transition-all`}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatMonthLabel(point.month)}: ${valueFormatter(point.value)}`}
                  />
                </div>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {formatMonthLabel(point.month)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DelinquencyChart({ pct }: { pct: number }) {
  const safePct = Math.min(Math.max(pct, 0), 100)

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Inadimplência</h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Percentual de alunos inadimplentes sobre a base ativa
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-3xl font-semibold text-[var(--color-warning)]">{safePct.toFixed(1)}%</div>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[var(--color-border)]">
          <div
            className="h-full rounded-full bg-[var(--color-warning)] transition-all"
            style={{ width: `${safePct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface AcademyChartsProps {
  data: AcademyChartData
  showFinance: boolean
  compact?: boolean
  /** Apenas o gráfico de matrículas — preenche a célula do grid pai */
  single?: boolean
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function AcademyCharts({ data, showFinance, compact = false, single = false }: AcademyChartsProps) {
  if (single) {
    return (
      <BarChart
        title="Novas matrículas"
        subtitle="Alunos ativos e trial por mês de matrícula (últimos 6 meses)"
        points={data.activeByMonth}
        accent="primary"
      />
    )
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-2 ${compact ? '' : 'mt-8'}`}>
      <BarChart
        title="Novas matrículas"
        subtitle="Alunos ativos e trial por mês de matrícula (últimos 6 meses)"
        points={data.activeByMonth}
        accent="primary"
      />
      {showFinance ? (
        <>
          <DelinquencyChart pct={data.delinquencyPct} />
          <div className="lg:col-span-2">
            <BarChart
              title="Receita recebida"
              subtitle="Faturas pagas por mês (últimos 6 meses)"
              points={data.revenueByMonth}
              valueFormatter={formatCurrency}
              accent="success"
            />
          </div>
        </>
      ) : null}
    </div>
  )
}
