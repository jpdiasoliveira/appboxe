export type PaymentsMode = 'mock' | 'live'

export function resolvePaymentsMode(env: {
  VITE_PAYMENTS_MODE?: string
  VITE_PAGARME_PUBLIC_KEY?: string
} = import.meta.env): PaymentsMode {
  const explicit = env.VITE_PAYMENTS_MODE?.trim().toLowerCase()
  if (explicit === 'live' || explicit === 'mock') return explicit
  return env.VITE_PAGARME_PUBLIC_KEY?.trim() ? 'live' : 'mock'
}

export function isPaymentsMock(env: {
  VITE_PAYMENTS_MODE?: string
  VITE_PAGARME_PUBLIC_KEY?: string
} = import.meta.env): boolean {
  return resolvePaymentsMode(env) === 'mock'
}
