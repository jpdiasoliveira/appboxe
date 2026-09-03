import { useEffect, useState } from 'react'

import { KpiCard } from '../../components/ui/KpiCard'

import { fetchPlatformKpis } from './platform-api'

import type { PlatformKpis } from '../../lib/platform-types'



function formatBrl(value: number) {

  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

}



export function PlatformDashboardPage() {

  const [kpis, setKpis] = useState<PlatformKpis | null>(null)

  const [error, setError] = useState<string | null>(null)



  useEffect(() => {

    fetchPlatformKpis()

      .then(setKpis)

      .catch((e: Error) => setError(e.message))

  }, [])



  if (error) {

    return (

      <p className="text-sm text-[var(--color-danger)]">

        Erro ao carregar KPIs. Aplicou as migrations? ({error})

      </p>

    )

  }



  return (

    <div>

      <h2 className="mb-6 text-2xl font-semibold">Dashboard Plataforma</h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <KpiCard label="Academias ativas" value={kpis?.academiasAtivas ?? '—'} />

        <KpiCard label="MRR SaaS" value={kpis ? formatBrl(kpis.mrr) : '—'} />

        <KpiCard label="Alunos na rede" value={kpis?.totalAlunos ?? '—'} />

        <KpiCard
          label="Faturas atrasadas"
          value={kpis?.inadimplencia ?? '—'}
          trend={kpis && kpis.inadimplencia > 0 ? 'Atenção' : undefined}
          trendPositive={false}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Alunos ativos" value={kpis?.alunosAtivos ?? '—'} />
        <KpiCard label="Academias inativas" value={kpis?.academiasInativas ?? '—'} />
        <KpiCard label="Churn academias (30d)" value={kpis?.churnAcademias30d ?? '—'} />
        <KpiCard label="Leads este mês" value={kpis?.leadsMes ?? '—'} />

      </div>

    </div>

  )

}


