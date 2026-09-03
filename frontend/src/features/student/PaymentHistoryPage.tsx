import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { useStudentContext } from '../../contexts/StudentContext'
import { usePagination } from '../../hooks/usePagination'
import type { InvoiceStatus } from '../../lib/types'
import { fetchInvoiceHistory } from './student-api'
import type { StudentInvoice } from '../../lib/student-types'

function statusVariant(status: InvoiceStatus): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'PAGO') return 'success'
  if (status === 'ATRASADO') return 'danger'
  if (status === 'PENDENTE') return 'warning'
  return 'muted'
}

export function PaymentHistoryPage() {
  const { student } = useStudentContext()
  const [rows, setRows] = useState<StudentInvoice[]>([])

  useEffect(() => {
    if (!student) return
    fetchInvoiceHistory(student.id).then(setRows)
  }, [student])

  const pagination = usePagination(rows)

  const columns: DataColumn<StudentInvoice>[] = [
    {
      id: 'due',
      header: 'Vencimento',
      primary: true,
      render: (row) => row.due_date,
    },
    {
      id: 'amount',
      header: 'Valor',
      render: (row) =>
        Number(row.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader title="Histórico de pagamentos" />

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum pagamento registrado."
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
