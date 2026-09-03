import { describe, expect, it } from 'vitest'
import {
  buildPlatformFinanceReportCsv,
  computePlatformFinanceSummary,
  type PlatformFinanceReportRow,
} from './platform-finance-report'

const rows: PlatformFinanceReportRow[] = [
  {
    id: '1',
    academyId: 'a1',
    academyName: 'Academia Teste',
    academySlug: 'academia-teste',
    academyStatus: 'ATIVO',
    planName: 'Pro',
    planMrr: 199,
    amount: 199,
    dueDate: '2026-09-01',
    status: 'PAGO',
    paidAt: '2026-09-02',
  },
  {
    id: '2',
    academyId: 'a2',
    academyName: 'Boxe Sul',
    academySlug: 'boxe-sul',
    academyStatus: 'ATIVO',
    planName: 'Starter',
    planMrr: 99,
    amount: 99,
    dueDate: '2026-09-10',
    status: 'PENDENTE',
    paidAt: null,
  },
]

describe('computePlatformFinanceSummary', () => {
  it('agrega valores por status', () => {
    expect(computePlatformFinanceSummary(rows)).toEqual({
      invoiceCount: 2,
      totalAmount: 298,
      paidAmount: 199,
      pendingAmount: 99,
      overdueAmount: 0,
    })
  })
})

describe('buildPlatformFinanceReportCsv', () => {
  it('inclui colunas enriquecidas', () => {
    const csv = buildPlatformFinanceReportCsv(rows)
    expect(csv.headers).toContain('Plano SaaS')
    expect(csv.rows[0][0]).toBe('Academia Teste')
    expect(csv.rows[1][7]).toBe('PENDENTE')
  })
})
