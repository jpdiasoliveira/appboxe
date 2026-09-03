import { useEffect, useState } from 'react'
import { downloadCsv } from '../../lib/csv-export'
import { Pagination } from '../../components/ui/Pagination'
import { usePagination } from '../../hooks/usePagination'
import { fetchAuditLogs } from './platform-api'
import type { AuditLogRow } from '../../lib/platform-types'
import { Button } from '../../components/ui/Button'

export function PlatformAuditPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([])

  useEffect(() => {
    fetchAuditLogs().then(setRows)
  }, [])

  const pagination = usePagination(rows)

  function exportCsv() {
    downloadCsv(
      'audit-logs.csv',
      ['data', 'acao', 'tipo', 'usuario'],
      rows.map((r) => [r.created_at, r.action, r.entity_type, r.user_id ?? '']),
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Auditoria</h2>
        <Button variant="ghost" type="button" onClick={exportCsv}>
          Exportar CSV
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <div className="space-y-2 p-4">
          {pagination.totalItems === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum registro ainda.</p>
          ) : (
            pagination.paginatedItems.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-3 text-sm"
              >
                <div className="flex justify-between gap-4">
                  <span className="font-medium">{r.action}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {new Date(r.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {r.entity_type} · user {r.user_id?.slice(0, 8) ?? '—'}
                </p>
              </div>
            ))
          )}
        </div>
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
      </div>
    </div>
  )
}
