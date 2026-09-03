import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { Select } from '../../components/ui/Select'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePagination } from '../../hooks/usePagination'
import { downloadCsv } from '../../lib/csv-export'
import {
  buildFinanceReportCsv,
  buildFinanceReportPrintHtml,
  computeFinanceReportSummary,
  printFinanceReport,
  type FinanceReportRow,
} from '../../lib/finance-report'
import type { InvoiceStatus } from '../../lib/types'
import { fetchAcademyFinanceReport, fetchCategories } from './academy-api'

function defaultFromDate() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return date.toISOString().slice(0, 10)
}

function statusVariant(status: InvoiceStatus): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'PAGO') return 'success'
  if (status === 'ATRASADO') return 'danger'
  if (status === 'PENDENTE') return 'warning'
  return 'muted'
}

const columns: DataColumn<FinanceReportRow>[] = [
  {
    id: 'student',
    header: 'Aluno',
    primary: true,
    render: (row) => row.studentName,
  },
  {
    id: 'categories',
    header: 'Modalidades',
    hideOnMobile: true,
    render: (row) => row.categoryNames,
  },
  {
    id: 'amount',
    header: 'Valor',
    render: (row) =>
      row.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  },
  {
    id: 'due',
    header: 'Vencimento',
    render: (row) => row.dueDate,
  },
  {
    id: 'status',
    header: 'Status',
    render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
  },
  {
    id: 'payment',
    header: 'Pagamento',
    hideOnMobile: true,
    render: (row) => row.paymentMethod ?? '—',
  },
]

export function AcademyFinanceReportPage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const academyName =
    roles.find((role) => role.academy_id === activeAcademyId)?.academy?.name ?? 'Academia'

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [rows, setRows] = useState<FinanceReportRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId)
      .then((list) =>
        setCategories(
          list.filter((category) => category.status === 'ATIVO').map((category) => ({
            id: category.id,
            name: category.name,
          })),
        ),
      )
      .catch(() => setCategories([]))
  }, [activeAcademyId])

  async function loadReport() {
    if (!activeAcademyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAcademyFinanceReport(activeAcademyId, {
        fromDate,
        toDate,
        status,
        categoryId,
      })
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatório')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeAcademyId) return
    void loadReport()
  }, [activeAcademyId])

  const summary = useMemo(() => computeFinanceReportSummary(rows), [rows])
  const reportKey = `${fromDate}-${toDate}-${status}-${categoryId}`
  const pagination = usePagination(rows, { resetKey: reportKey })

  function exportCsv() {
    const csv = buildFinanceReportCsv(rows)
    downloadCsv(`relatorio-financeiro-${fromDate}-${toDate}.csv`, csv.headers, csv.rows)
  }

  function exportPdf() {
    const html = buildFinanceReportPrintHtml({
      academyName,
      filters: { fromDate, toDate, status, categoryId },
      summary,
      rows,
    })
    printFinanceReport(html)
  }

  return (
    <div>
      <PageHeader
        title="Relatório financeiro"
        description="Faturas por período com filtros de status e modalidade. Exporte CSV ou imprima em PDF."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={loading || rows.length === 0}
              onClick={exportCsv}
            >
              Exportar CSV
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={loading || rows.length === 0}
              onClick={exportPdf}
            >
              Imprimir / PDF
            </Button>
            <Link to="/academy/financeiro">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Voltar ao financeiro
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label htmlFor="finance-from">De</Label>
            <Input
              id="finance-from"
              type="date"
              className="mt-1"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="finance-to">Até</Label>
            <Input
              id="finance-to"
              type="date"
              className="mt-1"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="finance-status">Status</Label>
            <Select
              id="finance-status"
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
          <div>
            <Label htmlFor="finance-category">Modalidade</Label>
            <Select
              id="finance-category"
              className="mt-1"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Button type="button" className="w-full" disabled={loading} onClick={() => void loadReport()}>
              {loading ? 'Carregando...' : 'Aplicar filtros'}
            </Button>
          </div>
        </div>
      </div>

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Faturas</p>
          <p className="text-2xl font-semibold">{summary.invoiceCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Recebido</p>
          <p className="text-2xl font-semibold text-[var(--color-success)]">
            {summary.paidAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Pendente</p>
          <p className="text-2xl font-semibold">
            {summary.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm text-[var(--color-text-muted)]">Atrasado</p>
          <p className="text-2xl font-semibold text-[var(--color-danger)]">
            {summary.overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage={loading ? 'Carregando...' : 'Nenhuma fatura no período.'}
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
