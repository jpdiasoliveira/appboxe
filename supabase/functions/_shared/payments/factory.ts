import { MockPaymentService } from './mock-payment-service.ts'
import { PagarmePaymentService } from './pagarme-payment-service.ts'
import type { PaymentService, PaymentsMode } from './types.ts'

export function resolvePaymentsMode(env: {
  PAYMENTS_MODE?: string
  PAGARME_API_KEY?: string
}): PaymentsMode {
  const explicit = env.PAYMENTS_MODE?.trim().toLowerCase()
  if (explicit === 'live' || explicit === 'mock') return explicit
  return env.PAGARME_API_KEY?.trim() ? 'live' : 'mock'
}

export function createPaymentService(env: {
  PAYMENTS_MODE?: string
  PAGARME_API_KEY?: string
  PAGARME_WEBHOOK_SECRET?: string
}): PaymentService {
  const mode = resolvePaymentsMode(env)
  if (mode === 'live') {
    const apiKey = env.PAGARME_API_KEY?.trim()
    if (!apiKey) return new MockPaymentService()
    return new PagarmePaymentService(apiKey, env.PAGARME_WEBHOOK_SECRET)
  }
  return new MockPaymentService()
}
