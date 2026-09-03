import type { ReactNode } from 'react'

export interface DataColumn<T> {
  id: string
  header: string
  render: (row: T) => ReactNode
  /** Título do card no mobile (usa a primeira coluna `primary`) */
  primary?: boolean
  /** Não exibe no card mobile */
  hideOnMobile?: boolean
  /** Classe extra na célula da tabela (desktop) */
  cellClassName?: string
  /** Classe extra no cabeçalho (desktop) */
  headerClassName?: string
}

export interface ResponsiveDataListProps<T> {
  columns: DataColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  renderActions?: (row: T) => ReactNode
  footer?: ReactNode
  /** Seleção múltipla (UP-308) */
  selection?: {
    selectedKeys: Set<string>
    onToggle: (key: string) => void
    onToggleAll: (keys: string[], checked: boolean) => void
    isRowSelectable?: (row: T) => boolean
  }
}

export function ResponsiveDataList<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Nenhum item encontrado.',
  renderActions,
  footer,
  selection,
}: ResponsiveDataListProps<T>) {
  const primaryColumn = columns.find((c) => c.primary) ?? columns[0]
  const mobileFields = columns.filter((c) => !c.hideOnMobile && c.id !== primaryColumn?.id)

  const selectableKeys = selection
    ? rows
        .filter((row) => (selection.isRowSelectable ? selection.isRowSelectable(row) : true))
        .map((row) => rowKey(row))
    : []
  const allSelected =
    selectableKeys.length > 0 && selectableKeys.every((k) => selection?.selectedKeys.has(k))

  function renderCheckbox(row: T) {
    if (!selection) return null
    const key = rowKey(row)
    const selectable = selection.isRowSelectable ? selection.isRowSelectable(row) : true
    if (!selectable) return <span className="inline-block w-4" />
    return (
      <input
        type="checkbox"
        aria-label="Selecionar linha"
        checked={selection.selectedKeys.has(key)}
        onChange={() => selection.onToggle(key)}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
      {/* Desktop: tabela */}
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-elevated)] text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              {selection ? (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos"
                    checked={allSelected}
                    onChange={(e) => selection.onToggleAll(selectableKeys, e.target.checked)}
                    disabled={selectableKeys.length === 0}
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th key={col.id} className={`px-4 py-3 ${col.headerClassName ?? ''}`}>
                  {col.header}
                </th>
              ))}
              {renderActions ? (
                <th className="w-14 px-2 py-3 text-right">Ações</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t border-[var(--color-border)]">
                {selection ? <td className="w-10 px-4 py-3">{renderCheckbox(row)}</td> : null}
                {columns.map((col) => (
                  <td key={col.id} className={`px-4 py-3 ${col.cellClassName ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
                {renderActions ? (
                  <td className="relative w-14 px-2 py-3 text-right">
                    <div className="flex justify-end">{renderActions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (renderActions ? 1 : 0) + (selection ? 1 : 0)}
                  className="px-4 py-8 text-center text-[var(--color-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="divide-y divide-[var(--color-border)] md:hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
        ) : (
          rows.map((row) => (
            <article key={rowKey(row)} className="bg-[var(--color-bg-card)] p-4">
              <div className="mb-3 flex items-start gap-3">
                {selection ? <div className="pt-0.5">{renderCheckbox(row)}</div> : null}
                {primaryColumn ? (
                  <div className="flex-1 font-medium text-[var(--color-text)]">
                    {primaryColumn.render(row)}
                  </div>
                ) : null}
              </div>
              <dl className="space-y-2 text-sm">
                {mobileFields.map((col) => (
                  <div key={col.id} className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-[var(--color-text-muted)]">{col.header}</dt>
                    <dd className="text-right text-[var(--color-text)]">{col.render(row)}</dd>
                  </div>
                ))}
              </dl>
              {renderActions ? (
                <div className="mt-4 flex justify-end border-t border-[var(--color-border)] pt-3">
                  {renderActions(row)}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>

      {footer}
    </div>
  )
}
