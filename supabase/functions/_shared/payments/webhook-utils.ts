export type ParsedWebhookEvent = {
  eventId: string | null
  eventType: string
  chargeId: string | null
  orderId: string | null
  invoiceId: string | null
  paid: boolean
  paymentMethod: 'PIX' | 'BOLETO' | 'CARTAO' | null
  amountCents: number | null
}

const PAID_EVENTS = new Set(['charge.paid', 'order.paid', 'payment_confirmed'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readInvoiceId(...sources: Array<Record<string, unknown>>): string | null {
  for (const source of sources) {
    const metadata = asRecord(source.metadata)
    const invoiceId = metadata.invoice_id
    if (typeof invoiceId === 'string' && UUID_RE.test(invoiceId)) return invoiceId

    const code = source.code
    if (typeof code === 'string' && UUID_RE.test(code)) return code
  }
  return null
}

function mapPaymentMethod(value: unknown): ParsedWebhookEvent['paymentMethod'] {
  if (value === 'pix') return 'PIX'
  if (value === 'boleto') return 'BOLETO'
  if (value === 'credit_card') return 'CARTAO'
  return null
}

export function parsePagarmeWebhookBody(body: Record<string, unknown>): ParsedWebhookEvent | null {
  const eventType = typeof body.type === 'string' ? body.type : 'unknown'
  const eventId = typeof body.id === 'string' ? body.id : null
  const data = asRecord(body.data)

  let charge = data
  if (eventType.startsWith('order.') && Array.isArray(data.charges) && data.charges[0]) {
    charge = asRecord(data.charges[0])
  }

  const invoiceId = readInvoiceId(charge, data, asRecord(charge.order), asRecord(data.order))
  const chargeId =
    typeof charge.id === 'string'
      ? charge.id
      : eventType.startsWith('charge.') && typeof data.id === 'string'
        ? data.id
        : null
  const orderId =
    typeof charge.order_id === 'string'
      ? charge.order_id
      : eventType.startsWith('order.') && typeof data.id === 'string'
        ? data.id
        : null

  const status =
    typeof charge.status === 'string'
      ? charge.status
      : typeof data.status === 'string'
        ? data.status
        : ''
  const paid = PAID_EVENTS.has(eventType) || status === 'paid'
  const paymentMethod = mapPaymentMethod(charge.payment_method ?? data.payment_method)
  const amountCents =
    typeof charge.amount === 'number'
      ? charge.amount
      : typeof data.amount === 'number'
        ? data.amount
        : null

  return {
    eventId,
    eventType,
    chargeId,
    orderId,
    invoiceId,
    paid,
    paymentMethod,
    amountCents,
  }
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function verifyPagarmeWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!secret.trim()) return true
  if (!signatureHeader?.trim()) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expectedHex = Array.from(new Uint8Array(mac))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  const candidates = signatureHeader
    .split(',')
    .map((part) => part.trim().replace(/^sha256=/i, '').toLowerCase())

  return candidates.some((signature) => timingSafeEqual(signature, expectedHex.toLowerCase()))
}

export function extractSignatureHeader(req: Request): string | null {
  return (
    req.headers.get('x-pagarme-signature') ??
    req.headers.get('x-hub-signature-256') ??
    req.headers.get('x-hub-signature')
  )
}

export function buildWebhookIdempotencyKey(event: ParsedWebhookEvent): string {
  if (event.eventId) return `pagarme:event:${event.eventId}`
  if (event.chargeId) return `pagarme:charge:${event.chargeId}`
  if (event.invoiceId) return `pagarme:invoice:${event.invoiceId}`
  return `pagarme:unknown:${crypto.randomUUID()}`
}
