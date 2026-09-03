import { MockPaymentService } from './mock-payment-service'
import { PagarmePaymentService } from './pagarme-payment-service'
import { resolvePaymentsMode } from './payments-mode'
import type { PaymentService } from './types'

let cached: PaymentService | null = null

export function getPaymentService(): PaymentService {
  if (cached) return cached

  const mode = resolvePaymentsMode()
  if (mode === 'live') {
    const publicKey = import.meta.env.VITE_PAGARME_PUBLIC_KEY?.trim()
    cached = publicKey ? new PagarmePaymentService(publicKey) : new MockPaymentService()
    return cached
  }

  cached = new MockPaymentService()
  return cached
}

export function resetPaymentServiceForTests() {
  cached = null
}
