import { useEffect, useMemo, useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { KpiCard } from '../../components/ui/KpiCard'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { Select } from '../../components/ui/Select'
import { usePagination } from '../../hooks/usePagination'
import { downloadCsv } from '../../lib/csv-export'
import {
  buildPlatformFinanceReportCsv,
  computePlatformFinanceSummary,
  type PlatformFinanceReportRow,
} from '../../lib/platform-finance-report'
import type { InvoiceStatus } from '../../lib/types'
import {
  fetchPlatformKpis,
  fetchSaasFinanceReport,
  markInvoicePaid,
} from './platform-api'
import type { PlatformKpis } from '../../lib/platform-types'

function defaultFromDate() {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  return date.toISOString().slice(0, 10)
}

function invoiceVariant(status: InvoiceStatus): 'success' | 'danger' | 'warning' | 'muted' {
  if (status === 'PAGO') return 'success'
  if (status === 'ATRASADO') return 'danger'
  if (status === 'PENDENTE') return 'warning'
  return 'muted'
}

function formatBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const columns: DataColumn<PlatformFinanceReportRow>[] = [
  {
    id: 'academy',
    header: 'Academia',
    primary: true,
    render: (row) => row.academyName,
  },
  {
    id: 'plan',
    header: 'Plano',
    hideOnMobile: true,
    render: (row) => row.planName ?? '—',
  },
  {
    id: 'amount',
    header: 'Valor',
    render: (row) => formatBrl(row.amount),
  },
  {
    id: 'due',
    header: 'Vencimento',
    cellClassName: 'text-[var(--color-text-muted)]',
    render: (row) => row.dueDate,
  },
  {
    id: 'status',
    header: 'Status',
    render: (row) => <Badge variant={invoiceVariant(row.status)}>{row.status}</Badge>,
  },
]

export function PlatformFinancePage() {
  const [kpis, setKpis] = useState<PlatformKpis | null>(null)
  const [rows, setRows] = useState<PlatformFinanceReportRow[]>([])
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadReport() {
    setLoading(true)
    setError(null)
    try {
      const [kpiData, reportRows] = await Promise.all([
        fetchPlatformKpis(),
        fetchSaasFinanceReport({ fromDate, toDate, status }),
      ])
      setKpis(kpiData)
      setRows(reportRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar financeiro')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReport()
  }, [])

  const summary = useMemo(() => computePlatformFinanceSummary(rows), [rows])
  const reportKey = `${fromDate}-${toDate}-${status}`
  const pagination = usePagination(rows, { resetKey: reportKey })

  async function pay(id: string) {
    await markInvoicePaid(id)
    await loadReport()
  }

  function exportCsv() {
    const csv = buildPlatformFinanceReportCsv(rows)
    downloadCsv(`financeiro-saas-${fromDate}-${toDate}.csv`, csv.headers, csv.rows)
  }

  return (
    <div>
      <PageHeader
        title="Financeiro SaaS"
        description="Faturas das academias na rede, MRR e churn. Exporte CSV enriquecido com plano e status da academia."
        actions={
          <Button
            variant="ghost"
            type="button"
            className="w-full sm:w-auto"
            disabled={loading || rows.length === 0}
            onClick={exportCsv}
          >
            Exportar CSV
          </Button>
        }
      />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="MRR SaaS" value={kpis ? formatBrl(kpis.mrr) : '—'} />
        <KpiCard label="Receita recebida (mês)" value={kpis ? formatBrl(kpis.receitaRecebidaMes) : '—'} />
        <KpiCard label="Alunos na rede" value={kpis?.totalAlunos ?? '—'} />
        <KpiCard
          label="Churn academias (30d)"
          value={kpis?.churnAcademias30d ?? '—'}
          trend={kpis && kpis.churnAcademias30d > 0 ? 'Atenção' : undefined}
          trendPositive={false}
        />
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label htmlFor="saas-from">De</Label>
            <Input
              id="saas-from"
              type="date"
              className="mt-1"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="saas-to">Até</Label>
            <Input
              id="saas-to"
              type="date"
              className="mt-1"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="saas-status">Status</Label>
            <Select
              id="saas-status"
              className="mt-1"
              value={status}
              onChange={(event) => setStatus(event.target.value as InvoiceStatus | '')}
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PAGO">Pago</option>
              <option value="ATRASADO">Atrasado</option>
              <option value="CANCELADO">Cancelado</option>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <Button type="button" className="w-full" disabled={loading} onClick={() => void loadReport()}>
              {loading ? 'Carregando...' : 'Aplicar filtros'}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Faturas no período</p>
          <p className="text-2xl font-semibold">{summary.invoiceCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Recebido</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">{formatBrl(summary.paidAmount)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Pendente</p>
          <p className="text-2xl font-semibold">{formatBrl(summary.pendingAmount)}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Atrasado</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">{formatBrl(summary.overdueAmount)}</p>
        </div>
      </div>

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage={loading ? 'Carregando...' : 'Nenhuma fatura no período.'}
        renderActions={(row) => (
          <RowActionsMenu
            ariaLabel={`Ações da fatura de ${row.academyName}`}
            items={
              row.status !== 'PAGO'
                ? [
                    {
                      id: 'pay',
                      label: 'Marcar pago',
                      icon: CheckCircleIcon,
                      onClick: () => void pay(row.id),
                    },
                  ]
                : []
            }
          />
        )}
        footer={
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            from={pagination.from}
            to={pagination.to}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        }
      />
    </div>
  )
}
