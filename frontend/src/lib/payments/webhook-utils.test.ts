import { describe, expect, it } from 'vitest'
import {
  buildWebhookIdempotencyKey,
  parsePagarmeWebhookBody,
  timingSafeEqual,
} from '../../../../supabase/functions/_shared/payments/webhook-utils'

const INVOICE_ID = 'a1b2c3d4-e5f6-4789-a012-3456789abcde'

describe('parsePagarmeWebhookBody', () => {
  it('extrai invoice_id de charge.paid', () => {
    const parsed = parsePagarmeWebhookBody({
      id: 'hook_123',
      type: 'charge.paid',
      data: {
        id: 'ch_abc',
        status: 'paid',
        payment_method: 'pix',
        amount: 9900,
        metadata: { invoice_id: INVOICE_ID },
      },
    })

    expect(parsed?.invoiceId).toBe(INVOICE_ID)
    expect(parsed?.paid).toBe(true)
    expect(parsed?.paymentMethod).toBe('PIX')
    expect(parsed?.chargeId).toBe('ch_abc')
  })

  it('extrai invoice_id de order.paid via charges[0].code', () => {
    const parsed = parsePagarmeWebhookBody({
      id: 'hook_456',
      type: 'order.paid',
      data: {
        id: 'or_xyz',
        charges: [
          {
            id: 'ch_def',
            status: 'paid',
            payment_method: 'boleto',
            code: INVOICE_ID,
          },
        ],
      },
    })

    expect(parsed?.invoiceId).toBe(INVOICE_ID)
    expect(parsed?.paymentMethod).toBe('BOLETO')
    expect(parsed?.orderId).toBe('or_xyz')
  })

  it('ignora eventos não pagos', () => {
    const parsed = parsePagarmeWebhookBody({
      type: 'charge.pending',
      data: {
        id: 'ch_pending',
        status: 'pending',
        metadata: { invoice_id: INVOICE_ID },
      },
    })

    expect(parsed?.paid).toBe(false)
  })
})

describe('buildWebhookIdempotencyKey', () => {
  it('prioriza event id', () => {
    const key = buildWebhookIdempotencyKey({
      eventId: 'hook_1',
      eventType: 'charge.paid',
      chargeId: 'ch_1',
      orderId: null,
      invoiceId: INVOICE_ID,
      paid: true,
      paymentMethod: 'PIX',
      amountCents: 1000,
    })
    expect(key).toBe('pagarme:event:hook_1')
  })
})

describe('timingSafeEqual', () => {
  it('compara strings com segurança', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
    expect(timingSafeEqual('ab', 'abc')).toBe(false)
  })
})
