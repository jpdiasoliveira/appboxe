import type { InvoiceStatus } from './types'

export type PlatformFinanceReportFilters = {
  fromDate: string
  toDate: string
  status: InvoiceStatus | ''
}

export type PlatformFinanceReportRow = {
  id: string
  academyId: string
  academyName: string
  academySlug: string
  academyStatus: string
  planName: string | null
  planMrr: number | null
  amount: number
  dueDate: string
  status: InvoiceStatus
  paidAt: string | null
}

export type PlatformFinanceReportSummary = {
  invoiceCount: number
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

export function computePlatformFinanceSummary(
  rows: PlatformFinanceReportRow[],
): PlatformFinanceReportSummary {
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

export function buildPlatformFinanceReportCsv(rows: PlatformFinanceReportRow[]): {
  headers: string[]
  rows: string[][]
} {
  return {
    headers: [
      'Academia',
      'Slug',
      'Status academia',
      'Plano SaaS',
      'MRR plano',
      'Valor fatura',
      'Vencimento',
      'Status fatura',
      'Pago em',
    ],
    rows: rows.map((row) => [
      row.academyName,
      row.academySlug,
      row.academyStatus,
      row.planName ?? '',
      row.planMrr != null ? row.planMrr.toFixed(2) : '',
      row.amount.toFixed(2),
      row.dueDate,
      row.status,
      row.paidAt ?? '',
    ]),
  }
}
