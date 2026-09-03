import { describe, expect, it } from 'vitest'
import {
  buildInvoiceReminderWhatsAppMessage,
  buildStudentInviteWhatsAppMessage,
  buildWhatsAppInviteUrl,
  normalizeWhatsAppPhone,
} from './invite-utils'

describe('normalizeWhatsAppPhone', () => {
  it('adiciona DDI 55 para celular BR', () => {
    expect(normalizeWhatsAppPhone('(11) 98765-4321')).toBe('5511987654321')
  })

  it('mantém número já com DDI', () => {
    expect(normalizeWhatsAppPhone('+55 11 98765-4321')).toBe('5511987654321')
  })

  it('retorna null sem dígitos', () => {
    expect(normalizeWhatsAppPhone('')).toBeNull()
  })
})

describe('buildStudentInviteWhatsAppMessage', () => {
  it('inclui link e nome da academia', () => {
    const message = buildStudentInviteWhatsAppMessage({
      inviteLink: 'https://app.test/convite/abc',
      academyName: 'Academia Teste',
      recipientName: 'João',
    })
    expect(message).toContain('João')
    expect(message).toContain('Academia Teste')
    expect(message).toContain('https://app.test/convite/abc')
  })
})

describe('buildInvoiceReminderWhatsAppMessage', () => {
  it('monta lembrete de vencimento', () => {
    const message = buildInvoiceReminderWhatsAppMessage({
      studentName: 'Maria',
      academyName: 'Academia Teste',
      amount: 150,
      dueDate: '2026-09-05',
    })
    expect(message).toContain('Maria')
    expect(message).toContain('Academia Teste')
    expect(message).toContain('05/09/2026')
    expect(message).toContain('R$')
  })

  it('monta mensagem de atraso', () => {
    const message = buildInvoiceReminderWhatsAppMessage({
      studentName: 'João',
      amount: 200,
      dueDate: '2026-09-01',
      overdue: true,
    })
    expect(message).toContain('em atraso')
  })
})

describe('buildWhatsAppInviteUrl', () => {
  it('monta wa.me com telefone', () => {
    const url = buildWhatsAppInviteUrl('11987654321', 'Olá')
    expect(url).toBe('https://wa.me/5511987654321?text=Ol%C3%A1')
  })

  it('monta wa.me sem telefone', () => {
    const url = buildWhatsAppInviteUrl(null, 'Olá mundo')
    expect(url).toBe('https://wa.me/?text=Ol%C3%A1%20mundo')
  })
})
