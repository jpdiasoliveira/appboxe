import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlagIcon } from '@heroicons/react/24/outline'
import { fetchAcademies } from './platform-api'
import type { AcademyRow } from '../../lib/platform-types'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { usePagination } from '../../hooks/usePagination'
import type { AcademyStatus } from '../../lib/types'

function statusVariant(status: AcademyStatus): 'success' | 'danger' | 'muted' {
  if (status === 'ATIVO') return 'success'
  if (status === 'SUSPENSO') return 'danger'
  return 'muted'
}

function planName(row: AcademyRow): string {
  const p = row.saas_plans
  const plan = Array.isArray(p) ? p[0] : p ?? row.saas_plan
  return plan?.name ?? '—'
}

export function AcademiesListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<AcademyRow[]>([])
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAcademies()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }, [])

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(filter.toLowerCase()) ||
      r.slug.toLowerCase().includes(filter.toLowerCase()),
  )
  const pagination = usePagination(filtered, { resetKey: filter })

  const columns: DataColumn<AcademyRow>[] = [
    { id: 'name', header: 'Nome', primary: true, render: (row) => row.name },
    {
      id: 'slug',
      header: 'Slug',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.slug,
    },
    { id: 'plan', header: 'Plano SaaS', render: (row) => planName(row) },
    {
      id: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Academias"
        actions={
          <Button className="w-full sm:w-auto" onClick={() => navigate('/platform/academias/nova')}>
            Nova academia
          </Button>
        }
      />

      <Input
        className="mb-4 w-full sm:max-w-md"
        placeholder="Buscar por nome ou slug..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {error ? <p className="mb-4 text-[var(--color-danger)]">{error}</p> : null}

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma academia encontrada."
        renderActions={(row) => (
          <RowActionsMenu
            ariaLabel={`Ações de ${row.name}`}
            items={[
              {
                id: 'flags',
                label: 'Feature flags',
                icon: FlagIcon,
                onClick: () => navigate(`/platform/academias/${row.id}/flags`),
              },
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
