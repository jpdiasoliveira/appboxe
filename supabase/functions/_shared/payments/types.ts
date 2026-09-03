export type PaymentsMode = 'mock' | 'live'

export type ChargeMethod = 'PIX' | 'BOLETO'

export type CardChargeStatus = 'PAGO' | 'FALHOU' | 'PENDENTE'

export interface PaymentCustomer {
  name: string
  email: string
  document?: string | null
  phone?: string | null
}

export interface CreateChargeInput {
  invoiceId: string
  amountCents: number
  description: string
  customer: PaymentCustomer
  dueDate?: string
}

export interface ChargeResult {
  method: ChargeMethod
  status: 'PENDENTE'
  copyPaste: string
  barcode?: string | null
  qrCodeUrl?: string | null
  boletoUrl?: string | null
  gatewayProvider: 'mock' | 'pagarme'
  gatewayChargeId: string | null
  gatewayMetadata: Record<string, unknown>
  message: string
}

export interface CardChargeInput extends CreateChargeInput {
  cardToken: string
}

export interface CardChargeResult {
  status: CardChargeStatus
  gatewayProvider: 'mock' | 'pagarme'
  gatewayChargeId: string | null
  gatewayMetadata: Record<string, unknown>
  message: string
}

export interface WebhookParseResult {
  eventType: string
  chargeId: string | null
  orderId: string | null
  invoiceId: string | null
  paid: boolean
  raw: unknown
}

export interface PaymentService {
  createPix(input: CreateChargeInput): Promise<ChargeResult>
  createBoleto(input: CreateChargeInput): Promise<ChargeResult>
  chargeCard(input: CardChargeInput): Promise<CardChargeResult>
  parseWebhook(payload: string, signature: string | null): WebhookParseResult | null
}
