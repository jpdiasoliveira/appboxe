interface KpiCardProps {
  label: string
  value: string | number
  trend?: string
  trendPositive?: boolean
}

export function KpiCard({ label, value, trend, trendPositive }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
      <p className="text-[13px] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold">{value}</p>
      {trend ? (
        <p
          className={`mt-1 text-xs ${trendPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
        >
          {trend}
        </p>
      ) : null}
    </div>
  )
}
