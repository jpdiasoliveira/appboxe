import type {
  CardChargeInput,
  CardChargeResult,
  ChargeMethod,
  ChargeResult,
  CreateChargeInput,
  PaymentService,
  WebhookParseResult,
} from './types.ts'
import { parsePagarmeWebhookBody } from './webhook-utils.ts'

const PAGARME_API_BASE = 'https://api.pagar.me/core/v5'

type PagarmeOrderResponse = {
  id?: string
  charges?: Array<{
    id?: string
    status?: string
    last_transaction?: {
      qr_code?: string
      qr_code_url?: string
      line?: string
      barcode?: string
      pdf?: string
      url?: string
      status?: string
    }
  }>
}

function pagarmeAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`
}

function sanitizeDocument(document?: string | null): string | undefined {
  if (!document) return undefined
  const digits = document.replace(/\D/g, '')
  return digits.length >= 11 ? digits : undefined
}

function normalizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return undefined
  const country = digits.startsWith('55') ? digits.slice(0, 2) : '55'
  const area = digits.startsWith('55') ? digits.slice(2, 4) : digits.slice(0, 2)
  const number = digits.startsWith('55') ? digits.slice(4) : digits.slice(2)
  return `${country}${area}${number}`
}

function extractCharge(order: PagarmeOrderResponse, method: ChargeMethod): ChargeResult {
  const charge = order.charges?.[0]
  const tx = charge?.last_transaction
  const copyPaste = method === 'PIX' ? (tx?.qr_code ?? '') : (tx?.line ?? tx?.barcode ?? '')
  const barcode = method === 'BOLETO' ? (tx?.barcode ?? tx?.line ?? null) : null

  if (!copyPaste) {
    throw new Error('Resposta Pagar.me sem código de pagamento')
  }

  const boletoUrl = method === 'BOLETO' ? (tx?.pdf ?? tx?.url ?? null) : null

  return {
    method,
    status: 'PENDENTE',
    copyPaste,
    barcode,
    qrCodeUrl: method === 'PIX' ? (tx?.qr_code_url ?? null) : null,
    boletoUrl,
    gatewayProvider: 'pagarme',
    gatewayChargeId: charge?.id ?? order.id ?? null,
    gatewayMetadata: {
      order_id: order.id ?? null,
      charge_id: charge?.id ?? null,
      qr_code_url: tx?.qr_code_url ?? null,
      boleto_url: boletoUrl,
      copy_paste: copyPaste,
      barcode,
    },
    message: method === 'PIX' ? 'PIX gerado via Pagar.me.' : 'Boleto gerado via Pagar.me.',
  }
}

export class PagarmePaymentService implements PaymentService {
  constructor(
    private readonly apiKey: string,
    private readonly webhookSecret?: string,
  ) {}

  private async createOrder(input: CreateChargeInput, method: ChargeMethod): Promise<ChargeResult> {
    const document = sanitizeDocument(input.customer.document)
    const phones = normalizePhone(input.customer.phone)

    const payment =
      method === 'PIX'
        ? {
            payment_method: 'pix',
            pix: { expires_in: 3600 },
          }
        : {
            payment_method: 'boleto',
            boleto: {
              due_at: input.dueDate ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              instructions: 'Pagamento de mensalidade RingPro',
            },
          }

    const body = {
      code: input.invoiceId,
      items: [
        {
          amount: input.amountCents,
          description: input.description,
          quantity: 1,
          code: input.invoiceId,
        },
      ],
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        type: 'individual',
        ...(document
          ? { document, document_type: document.length > 11 ? 'CNPJ' : 'CPF' }
          : {}),
        ...(phones
          ? {
              phones: {
                mobile_phone: {
                  country_code: phones.slice(0, 2),
                  area_code: phones.slice(2, 4),
                  number: phones.slice(4),
                },
              },
            }
          : {}),
      },
      payments: [payment],
      metadata: {
        invoice_id: input.invoiceId,
      },
    }

    const res = await fetch(`${PAGARME_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: pagarmeAuthHeader(this.apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const payload = (await res.json()) as PagarmeOrderResponse & { message?: string; errors?: unknown }

    if (!res.ok) {
      const detail =
        typeof payload.message === 'string'
          ? payload.message
          : JSON.stringify(payload.errors ?? payload)
      throw new Error(`Pagar.me: ${detail}`)
    }

    return extractCharge(payload, method)
  }

  async createPix(input: CreateChargeInput): Promise<ChargeResult> {
    return this.createOrder(input, 'PIX')
  }

  async createBoleto(input: CreateChargeInput): Promise<ChargeResult> {
    return this.createOrder(input, 'BOLETO')
  }

  async chargeCard(input: CardChargeInput): Promise<CardChargeResult> {
    const document = sanitizeDocument(input.customer.document)
    const phones = normalizePhone(input.customer.phone)

    const body = {
      code: input.invoiceId,
      items: [
        {
          amount: input.amountCents,
          description: input.description,
          quantity: 1,
          code: input.invoiceId,
        },
      ],
      customer: {
        name: input.customer.name,
        email: input.customer.email,
        type: 'individual',
        ...(document
          ? { document, document_type: document.length > 11 ? 'CNPJ' : 'CPF' }
          : {}),
        ...(phones
          ? {
              phones: {
                mobile_phone: {
                  country_code: phones.slice(0, 2),
                  area_code: phones.slice(2, 4),
                  number: phones.slice(4),
                },
              },
            }
          : {}),
      },
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            card_token: input.cardToken,
            installments: 1,
            statement_descriptor: 'RINGPRO',
          },
        },
      ],
      metadata: {
        invoice_id: input.invoiceId,
      },
    }

    const res = await fetch(`${PAGARME_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        Authorization: pagarmeAuthHeader(this.apiKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const payload = (await res.json()) as PagarmeOrderResponse & { message?: string; errors?: unknown }
    if (!res.ok) {
      const detail =
        typeof payload.message === 'string'
          ? payload.message
          : JSON.stringify(payload.errors ?? payload)
      return {
        status: 'FALHOU',
        gatewayProvider: 'pagarme',
        gatewayChargeId: null,
        gatewayMetadata: { error: detail },
        message: `Pagar.me: ${detail}`,
      }
    }

    const charge = payload.charges?.[0]
    const txStatus = charge?.last_transaction?.status ?? charge?.status ?? ''
    const paid = txStatus === 'paid' || charge?.status === 'paid'
    const failed = txStatus === 'failed' || charge?.status === 'failed'

    return {
      status: paid ? 'PAGO' : failed ? 'FALHOU' : 'PENDENTE',
      gatewayProvider: 'pagarme',
      gatewayChargeId: charge?.id ?? payload.id ?? null,
      gatewayMetadata: {
        order_id: payload.id ?? null,
        charge_id: charge?.id ?? null,
        transaction_status: txStatus,
      },
      message: paid
        ? 'Cobrança no cartão aprovada.'
        : failed
          ? 'Cobrança no cartão recusada.'
          : 'Cobrança no cartão pendente de confirmação.',
    }
  }

  parseWebhook(payload: string, signature: string | null): WebhookParseResult | null {
    if (this.webhookSecret && signature !== null && !signature.trim()) {
      return null
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(payload) as Record<string, unknown>
    } catch {
      return null
    }

    const parsed = parsePagarmeWebhookBody(body)
    if (!parsed) return null

    return {
      eventType: parsed.eventType,
      chargeId: parsed.chargeId,
      orderId: parsed.orderId,
      invoiceId: parsed.invoiceId,
      paid: parsed.paid,
      raw: body,
    }
  }
}
