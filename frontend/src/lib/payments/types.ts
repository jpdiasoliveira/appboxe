export type PaymentsMode = 'mock' | 'live'

export type ChargeMethod = 'PIX' | 'BOLETO'

export interface CardTokenInput {
  number: string
  holderName: string
  expMonth: number
  expYear: number
  cvv: string
}

export interface MockCardInput {
  lastFour: string
}

export type TokenizeCardInput = CardTokenInput | MockCardInput

export function isMockCardInput(input: TokenizeCardInput): input is MockCardInput {
  return 'lastFour' in input
}

export interface TokenizeCardResult {
  gateway: 'mock' | 'pagarme'
  token: string
  brand: string | null
  lastFour: string
}

export interface ChargeResult {
  method: ChargeMethod
  status: 'PENDENTE'
  copyPaste: string
  barcode?: string | null
  qrCodeUrl?: string | null
  boletoUrl?: string | null
  gatewayProvider?: 'mock' | 'pagarme'
  gatewayChargeId?: string | null
  message: string
}

export interface PaymentService {
  tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult>
  createPix(invoiceId: string): Promise<ChargeResult>
  createBoleto(invoiceId: string): Promise<ChargeResult>
}
