import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { usePagination } from '../../hooks/usePagination'
import {
  computeCategoryStats,
  computeConsecutiveAbsences,
  buildAttendanceReportCsv,
  type CategoryAttendanceStat,
  type ConsecutiveAbsenceRow,
} from '../../lib/attendance-report'
import { downloadCsv } from '../../lib/csv-export'
import { fetchAttendanceReportRecords, fetchCategories } from './academy-api'

function defaultFromDate() {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function absenceBadgeVariant(count: number): 'danger' | 'warning' | 'muted' {
  if (count >= 3) return 'danger'
  if (count >= 2) return 'warning'
  return 'muted'
}

const categoryColumns: DataColumn<CategoryAttendanceStat>[] = [
  {
    id: 'category',
    header: 'Turma',
    primary: true,
    render: (row) => row.categoryName,
  },
  {
    id: 'present',
    header: 'Presenças',
    render: (row) => `${row.presentCount} / ${row.totalRecords}`,
  },
  {
    id: 'pct',
    header: 'Frequência',
    render: (row) => `${row.attendancePct.toFixed(1)}%`,
  },
]

const absenceColumns: DataColumn<ConsecutiveAbsenceRow>[] = [
  {
    id: 'student',
    header: 'Aluno',
    primary: true,
    render: (row) => (
      <Link
        to={`/academy/alunos/${row.studentId}`}
        className="text-[var(--color-primary)] hover:underline"
      >
        {row.studentName}
      </Link>
    ),
  },
  {
    id: 'category',
    header: 'Turma',
    render: (row) => row.categoryName,
  },
  {
    id: 'streak',
    header: 'Faltas seguidas',
    render: (row) => (
      <Badge variant={absenceBadgeVariant(row.consecutiveAbsences)}>
        {String(row.consecutiveAbsences)}
      </Badge>
    ),
  },
  {
    id: 'last',
    header: 'Última chamada',
    hideOnMobile: true,
    render: (row) => new Date(`${row.lastClassDate}T12:00:00`).toLocaleDateString('pt-BR'),
  },
]

export function AttendanceReportPage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_attendance')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [fromDate, setFromDate] = useState(defaultFromDate)
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [minAbsences, setMinAbsences] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [records, setRecords] = useState<Awaited<ReturnType<typeof fetchAttendanceReportRecords>>>([])

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId)
      .then((rows) =>
        setCategories(rows.filter((c) => c.status === 'ATIVO').map((c) => ({ id: c.id, name: c.name }))),
      )
      .catch(() => setCategories([]))
  }, [activeAcademyId])

  async function loadReport() {
    if (!activeAcademyId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAttendanceReportRecords(
        activeAcademyId,
        fromDate,
        toDate,
        categoryId || undefined,
      )
      setRecords(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar relatório')
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeAcademyId || !enabled) return
    void loadReport()
  }, [activeAcademyId, enabled])

  const categoryStats = useMemo(() => computeCategoryStats(records), [records])
  const absenceRows = useMemo(
    () => computeConsecutiveAbsences(records, minAbsences),
    [records, minAbsences],
  )

  const reportResetKey = `${fromDate}-${toDate}-${categoryId}`
  const categoryPagination = usePagination(categoryStats, { resetKey: reportResetKey })
  const absencePagination = usePagination(absenceRows, {
    resetKey: `${reportResetKey}-${minAbsences}`,
  })

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  function exportCsv() {
    const { rows: csvRows } = buildAttendanceReportCsv(categoryStats, absenceRows)
    downloadCsv(`relatorio-presenca-${fromDate}-${toDate}.csv`, [], csvRows)
  }

  return (
    <div>
      <PageHeader
        title="Relatório de presença"
        description="Frequência por turma e alunos com faltas consecutivas. Dados respeitam o escopo do seu perfil (RLS)."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={loading || records.length === 0}
              onClick={exportCsv}
            >
              Exportar CSV
            </Button>
            <Link to="/academy/presenca">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Ir para chamada
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <div>
            <Label htmlFor="report-from">De</Label>
            <Input
              id="report-from"
              type="date"
              className="mt-1"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="report-to">Até</Label>
            <Input
              id="report-to"
              type="date"
              className="mt-1"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="report-category">Turma</Label>
            <Select
              id="report-category"
              className="mt-1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="report-min">Mín. faltas seguidas</Label>
            <Select
              id="report-min"
              className="mt-1"
              value={String(minAbsences)}
              onChange={(e) => setMinAbsences(Number(e.target.value))}
            >
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </Select>
          </div>
          <Button type="button" onClick={() => void loadReport()} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}

      <section className="mb-8 space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Frequência por turma</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Percentual de presenças registradas no período selecionado.
          </p>
        </div>
        <ResponsiveDataList
          columns={categoryColumns}
          rows={categoryPagination.paginatedItems}
          rowKey={(row) => row.categoryId}
          emptyMessage={
            loading
              ? 'Carregando dados...'
              : 'Nenhuma chamada registrada no período. Faça a chamada em Presença primeiro.'
          }
          footer={
            <Pagination
              page={categoryPagination.page}
              pageSize={categoryPagination.pageSize}
              totalItems={categoryPagination.totalItems}
              totalPages={categoryPagination.totalPages}
              from={categoryPagination.from}
              to={categoryPagination.to}
              onPageChange={categoryPagination.setPage}
              onPageSizeChange={categoryPagination.setPageSize}
            />
          }
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Faltas consecutivas</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Contagem a partir da chamada mais recente de cada aluno na turma.
          </p>
        </div>
        <ResponsiveDataList
          columns={absenceColumns}
          rows={absencePagination.paginatedItems}
          rowKey={(row) => `${row.studentId}-${row.categoryId}`}
          emptyMessage={
            loading
              ? 'Carregando dados...'
              : 'Nenhum aluno com faltas consecutivas no filtro atual.'
          }
          footer={
            <Pagination
              page={absencePagination.page}
              pageSize={absencePagination.pageSize}
              totalItems={absencePagination.totalItems}
              totalPages={absencePagination.totalPages}
              from={absencePagination.from}
              to={absencePagination.to}
              onPageChange={absencePagination.setPage}
              onPageSizeChange={absencePagination.setPageSize}
            />
          }
        />
      </section>
    </div>
  )
}
