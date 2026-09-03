import { useEffect, useState } from 'react'
import { AcademyCharts } from '../../components/AcademyCharts'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { KpiCard } from '../../components/ui/KpiCard'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { isScopedProfessor } from '../../lib/academy-permissions'
import { canAccessFinanceiro } from '../../lib/auth-utils'
import type { AcademyChartData, StudentBirthdayEntry } from '../../lib/academy-types'
import { AcademyDashboardSidebar } from './AcademyDashboardSidebar'
import { DashboardQuickLinks } from './components/DashboardQuickLinks'
import { DashboardUpcomingBirthdays } from './components/DashboardUpcomingBirthdays'
import { fetchAcademyCharts, fetchAcademyKpis, fetchStudentBirthdays } from './academy-api'
import { fetchAcademyMakeupStats } from './makeup-api'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const EMPTY_CHARTS: AcademyChartData = {
  activeByMonth: [],
  delinquencyPct: 0,
  revenueByMonth: [],
}

export function AcademyDashboardPage() {
  const { activeAcademyId, activeRole } = useAcademyContext()
  const showFinance = activeRole ? canAccessFinanceiro([activeRole]) : false
  const scopedProfessor = activeRole ? isScopedProfessor([activeRole]) : false
  const { enabled: makeupEnabled } = useFeatureFlag(activeAcademyId, 'module_class_makeup')
  const [kpis, setKpis] = useState({ alunosAtivos: 0, inadimplencia: 0, receitaMes: 0, turmasHoje: 0 })
  const [makeupStats, setMakeupStats] = useState({ disponivel: 0, usado: 0, expirado: 0, cancelado: 0 })
  const [charts, setCharts] = useState<AcademyChartData>(EMPTY_CHARTS)
  const [birthdays, setBirthdays] = useState<StudentBirthdayEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAcademyId) return
    Promise.all([
      fetchAcademyKpis(activeAcademyId, showFinance),
      fetchAcademyCharts(activeAcademyId, showFinance),
      fetchStudentBirthdays(activeAcademyId),
      makeupEnabled && showFinance ? fetchAcademyMakeupStats(activeAcademyId) : Promise.resolve(null),
    ])
      .then(([kpiData, chartData, birthdayData, makeupData]) => {
        setKpis(kpiData)
        setCharts(chartData)
        setBirthdays(birthdayData)
        if (makeupData) setMakeupStats(makeupData)
      })
      .catch((e: Error) => setError(e.message))
  }, [activeAcademyId, showFinance, makeupEnabled])

  const kpiCount = [true, showFinance, showFinance || scopedProfessor, true].filter(Boolean).length

  return (
    <div>
      <PageHeader title="Dashboard Academia" />

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}

      <div
        className={`mb-6 grid gap-4 ${
          kpiCount >= 4
            ? 'sm:grid-cols-2 xl:grid-cols-4'
            : kpiCount === 3
              ? 'sm:grid-cols-3'
              : 'sm:grid-cols-2'
        }`}
      >
        <KpiCard label="Alunos ativos" value={String(kpis.alunosAtivos)} />
        {showFinance ? (
          <KpiCard label="Receita do mês" value={formatCurrency(kpis.receitaMes)} />
        ) : null}
        {showFinance || scopedProfessor ? (
          <KpiCard label="Inadimplentes" value={String(kpis.inadimplencia)} />
        ) : null}
        <KpiCard label="Presenças hoje" value={String(kpis.turmasHoje)} />
        {showFinance && makeupEnabled ? (
          <KpiCard
            label="Reposições abertas"
            value={String(makeupStats.disponivel)}
            trend={`${makeupStats.usado} usadas · ${makeupStats.expirado} expiradas`}
            trendPositive
          />
        ) : null}
      </div>

      {!showFinance ? (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          {scopedProfessor
            ? 'Visão das suas turmas — sem dados financeiros da academia.'
            : 'Perfil sub-professor — dados financeiros ocultos.'}
        </p>
      ) : (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          Visão completa da academia — você também pode dar aula como professor.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <div className="space-y-6 xl:col-span-2">
          {showFinance ? (
            <>
              <AcademyCharts data={charts} showFinance />
              <DashboardQuickLinks />
            </>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                <AcademyCharts data={charts} showFinance={false} single />
                <DashboardUpcomingBirthdays birthdays={birthdays} />
              </div>
              <DashboardQuickLinks />
            </>
          )}
        </div>

        <AcademyDashboardSidebar
          academyId={activeAcademyId}
          birthdays={birthdays}
        />
      </div>
    </div>
  )
}
