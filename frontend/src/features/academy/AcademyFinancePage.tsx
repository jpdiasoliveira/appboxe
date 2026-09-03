import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChatBubbleLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePagination } from '../../hooks/usePagination'
import {
  buildInvoiceReminderWhatsAppMessage,
  openWhatsAppInvite,
} from '../../lib/invite-utils'
import type { InvoiceStatus } from '../../lib/types'
import { downloadCsv } from '../../lib/csv-export'
import { fetchAcademyInvoices, markAcademyInvoicePaidCash } from './academy-api'
import type { AcademyInvoiceRow } from '../../lib/academy-types'

function statusVariant(status: InvoiceStatus): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'PAGO') return 'success'
  if (status === 'ATRASADO') return 'danger'
  if (status === 'PENDENTE') return 'warning'
  return 'muted'
}

function resolveStudent(row: AcademyInvoiceRow) {
  const s = row.student
  if (!s) return { name: '—', phone: null as string | null }
  const one = Array.isArray(s) ? s[0] : s
  const p = one?.profile
  const name = !p ? '—' : Array.isArray(p) ? p[0]?.name ?? '—' : p.name
  return { name, phone: one?.phone ?? null }
}

function canRemind(status: InvoiceStatus): boolean {
  return status === 'PENDENTE' || status === 'ATRASADO'
}

function canMarkPaid(status: InvoiceStatus): boolean {
  return status === 'PENDENTE' || status === 'ATRASADO'
}

export function AcademyFinancePage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const [rows, setRows] = useState<AcademyInvoiceRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const activeAcademyName =
    roles.find((r) => r.academy_id === activeAcademyId)?.academy?.name ?? undefined

  function reload() {
    if (!activeAcademyId) return
    fetchAcademyInvoices(activeAcademyId)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [activeAcademyId])

  async function markPaidCash(row: AcademyInvoiceRow) {
    const student = resolveStudent(row)
    if (
      !window.confirm(
        `Confirmar pagamento em dinheiro de ${Number(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} para ${student.name}?`,
      )
    ) {
      return
    }
    setPayingId(row.id)
    setError(null)
    setSuccess(null)
    try {
      await markAcademyInvoicePaidCash(row.id)
      setSuccess(`Pagamento registrado para ${student.name}.`)
      reload()
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar pagamento')
    } finally {
      setPayingId(null)
    }
  }

  const pagination = usePagination(rows)

  function remindViaWhatsApp(row: AcademyInvoiceRow) {
    const student = resolveStudent(row)
    const message = buildInvoiceReminderWhatsAppMessage({
      studentName: student.name,
      academyName: activeAcademyName,
      amount: Number(row.amount),
      dueDate: row.due_date,
      overdue: row.status === 'ATRASADO',
    })
    openWhatsAppInvite(student.phone, message)
  }

  const columns: DataColumn<AcademyInvoiceRow>[] = [
    {
      id: 'student',
      header: 'Aluno',
      primary: true,
      render: (row) => resolveStudent(row).name,
    },
    {
      id: 'amount',
      header: 'Valor',
      render: (row) =>
        Number(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      id: 'due',
      header: 'Vencimento',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.due_date,
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Registre pagamentos em dinheiro na recepção. Lembretes in-app: D-3 e no vencimento. WhatsApp é envio manual pelo botão."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to="/academy/financeiro/relatorio">
              <Button type="button" variant="ghost" className="w-full sm:w-auto">
                Relatório
              </Button>
            </Link>
            {rows.length > 0 ? (
              <Button
                variant="ghost"
                type="button"
                className="w-full sm:w-auto"
                onClick={() =>
                  downloadCsv(
                    'financeiro-academia.csv',
                    ['Aluno', 'Valor', 'Vencimento', 'Status'],
                    rows.map((row) => [
                      resolveStudent(row).name,
                      String(row.amount),
                      row.due_date,
                      row.status,
                    ]),
                  )
                }
              >
                Exportar CSV
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}
      {success ? <FeedbackMessage variant="success" className="mb-4">{success}</FeedbackMessage> : null}

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma fatura registrada."
        renderActions={(row) => (
          <RowActionsMenu
            ariaLabel={`Ações da fatura de ${resolveStudent(row).name}`}
            items={[
              ...(canMarkPaid(row.status)
                ? [
                    {
                      id: 'cash',
                      label: payingId === row.id ? 'Registrando...' : 'Marcar pago (dinheiro)',
                      icon: CheckCircleIcon,
                      disabled: payingId === row.id,
                      onClick: () => void markPaidCash(row),
                    },
                  ]
                : []),
              ...(canRemind(row.status)
                ? [
                    {
                      id: 'whatsapp',
                      label: 'Lembrar via WhatsApp',
                      icon: ChatBubbleLeftIcon,
                      onClick: () => remindViaWhatsApp(row),
                    },
                  ]
                : []),
            ]}
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
