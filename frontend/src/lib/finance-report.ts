import type { InvoiceStatus } from './types'

export type FinanceReportFilters = {
  fromDate: string
  toDate: string
  status: InvoiceStatus | ''
  categoryId: string
}

export type FinanceReportRow = {
  id: string
  studentId: string
  studentName: string
  categoryNames: string
  amount: number
  dueDate: string
  status: InvoiceStatus
  paymentMethod: string | null
  paidAt: string | null
}

export type FinanceReportSummary = {
  invoiceCount: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

export function computeFinanceReportSummary(rows: FinanceReportRow[]): FinanceReportSummary {
  let paidAmount = 0
  let pendingAmount = 0
  let overdueAmount = 0

  for (const row of rows) {
    if (row.status === 'PAGO') paidAmount += row.amount
    else if (row.status === 'ATRASADO') overdueAmount += row.amount
    else if (row.status === 'PENDENTE') pendingAmount += row.amount
  }

  return {
    invoiceCount: rows.length,
    totalAmount: paidAmount + pendingAmount + overdueAmount,
    paidAmount,
    pendingAmount,
    overdueAmount,
  }
}

export function buildFinanceReportCsv(rows: FinanceReportRow[]): {
  headers: string[]
  rows: string[][]
} {
  return {
    headers: [
      'Aluno',
      'Modalidades',
      'Valor',
      'Vencimento',
      'Status',
      'Forma pagamento',
      'Pago em',
    ],
    rows: rows.map((row) => [
      row.studentName,
      row.categoryNames,
      row.amount.toFixed(2),
      row.dueDate,
      row.status,
      row.paymentMethod ?? '',
      row.paidAt ?? '',
    ]),
  }
}

export function buildFinanceReportPrintHtml(input: {
  academyName: string
  filters: FinanceReportFilters
  summary: FinanceReportSummary
  rows: FinanceReportRow[]
}): string {
  const { academyName, filters, summary, rows } = input
  const period = `${filters.fromDate} a ${filters.toDate}`
  const statusLabel = filters.status || 'Todos'
  const categoryLabel = filters.categoryId ? 'Filtrado por modalidade' : 'Todas'

  const tableRows = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.studentName)}</td>
        <td>${escapeHtml(row.categoryNames)}</td>
        <td>${formatBrl(row.amount)}</td>
        <td>${escapeHtml(row.dueDate)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(row.paymentMethod ?? '—')}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório financeiro — ${escapeHtml(academyName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p.meta { color: #555; margin: 0 0 16px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .kpi { border: 1px solid #ddd; border-radius: 8px; padding: 10px; }
    .kpi strong { display: block; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Relatório financeiro — ${escapeHtml(academyName)}</h1>
  <p class="meta">Período: ${escapeHtml(period)} · Status: ${escapeHtml(statusLabel)} · ${escapeHtml(categoryLabel)}</p>
  <div class="kpis">
    <div class="kpi"><span>Faturas</span><strong>${summary.invoiceCount}</strong></div>
    <div class="kpi"><span>Recebido</span><strong>${formatBrl(summary.paidAmount)}</strong></div>
    <div class="kpi"><span>Pendente</span><strong>${formatBrl(summary.pendingAmount)}</strong></div>
    <div class="kpi"><span>Atrasado</span><strong>${formatBrl(summary.overdueAmount)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Aluno</th>
        <th>Modalidades</th>
        <th>Valor</th>
        <th>Vencimento</th>
        <th>Status</th>
        <th>Pagamento</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="6">Nenhuma fatura no período.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

export function printFinanceReport(html: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
