import { describe, expect, it } from 'vitest'
import { inviteEmailStatusLabel } from '../features/invite/invite-api'

describe('inviteEmailStatusLabel', () => {
  it('indica envio com sucesso', () => {
    const label = inviteEmailStatusLabel(
      { token: 'x', expiresAt: '', emailMode: 'sent' },
      'aluno@teste.dev',
    )
    expect(label).toContain('aluno@teste.dev')
  })

  it('indica modo dev sem Resend', () => {
    const label = inviteEmailStatusLabel(
      { token: 'x', expiresAt: '', emailMode: 'stub' },
      'aluno@teste.dev',
    )
    expect(label).toContain('RESEND_API_KEY')
  })

  it('indica link aberto sem e-mail pré-definido', () => {
    const label = inviteEmailStatusLabel({ token: 'x', expiresAt: '' })
    expect(label).toContain('WhatsApp')
  })

  it('indica flag desligada', () => {
    const label = inviteEmailStatusLabel(
      {
        token: 'x',
        expiresAt: '',
        emailMode: 'skipped',
        emailMessage: 'E-mails desativados',
      },
      'aluno@teste.dev',
    )
    expect(label).toBe('E-mails desativados')
  })
})
