import { describe, expect, it } from 'vitest'
import {
  buildFinanceReportCsv,
  computeFinanceReportSummary,
  type FinanceReportRow,
} from './finance-report'

const sampleRows: FinanceReportRow[] = [
  {
    id: '1',
    studentId: 's1',
    studentName: 'Ana',
    categoryNames: 'Boxe',
    amount: 100,
    dueDate: '2026-09-01',
    status: 'PAGO',
    paymentMethod: 'PIX',
    paidAt: '2026-09-01',
  },
  {
    id: '2',
    studentId: 's2',
    studentName: 'Bruno',
    categoryNames: 'Muay Thai',
    amount: 150,
    dueDate: '2026-09-05',
    status: 'PENDENTE',
    paymentMethod: null,
    paidAt: null,
  },
  {
    id: '3',
    studentId: 's3',
    studentName: 'Carla',
    categoryNames: 'Boxe',
    amount: 80,
    dueDate: '2026-08-20',
    status: 'ATRASADO',
    paymentMethod: null,
    paidAt: null,
  },
]

describe('computeFinanceReportSummary', () => {
  it('soma por status', () => {
    expect(computeFinanceReportSummary(sampleRows)).toEqual({
      invoiceCount: 3,
      totalAmount: 330,
      paidAmount: 100,
      pendingAmount: 150,
      overdueAmount: 80,
    })
  })
})

describe('buildFinanceReportCsv', () => {
  it('monta colunas do relatório', () => {
    const csv = buildFinanceReportCsv(sampleRows)
    expect(csv.headers).toHaveLength(7)
    expect(csv.rows[0][0]).toBe('Ana')
    expect(csv.rows[1][4]).toBe('PENDENTE')
  })
})
