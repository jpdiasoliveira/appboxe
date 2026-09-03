import { describe, expect, it } from 'vitest'
import { getPaymentService, resetPaymentServiceForTests } from './factory'
import { MockPaymentService } from './mock-payment-service'
import { PagarmePaymentService } from './pagarme-payment-service'
import { isPaymentsMock, resolvePaymentsMode } from './payments-mode'

describe('resolvePaymentsMode', () => {
  it('respeita VITE_PAYMENTS_MODE explícito', () => {
    expect(resolvePaymentsMode({ VITE_PAYMENTS_MODE: 'live' })).toBe('live')
    expect(resolvePaymentsMode({ VITE_PAYMENTS_MODE: 'mock' })).toBe('mock')
  })

  it('infere live quando há chave pública', () => {
    expect(resolvePaymentsMode({ VITE_PAGARME_PUBLIC_KEY: 'pk_test_abc' })).toBe('live')
  })

  it('default mock sem env', () => {
    expect(resolvePaymentsMode({})).toBe('mock')
    expect(isPaymentsMock({})).toBe(true)
  })
})

describe('getPaymentService', () => {
  it('retorna MockPaymentService em modo mock', () => {
    resetPaymentServiceForTests()
    const service = getPaymentService()
    expect(service).toBeInstanceOf(MockPaymentService)
  })
})

describe('MockPaymentService.tokenizeCard', () => {
  it('gera token mock com últimos 4 dígitos', async () => {
    const service = new MockPaymentService()
    const result = await service.tokenizeCard({ lastFour: '4242' })
    expect(result.gateway).toBe('mock')
    expect(result.lastFour).toBe('4242')
    expect(result.token.startsWith('tok_mock_')).toBe(true)
  })
})

describe('PagarmePaymentService.tokenizeCard', () => {
  it('rejeita input mock em modo live', async () => {
    const service = new PagarmePaymentService('pk_test_x')
    await expect(service.tokenizeCard({ lastFour: '4242' })).rejects.toThrow(/dados completos/)
  })
})
