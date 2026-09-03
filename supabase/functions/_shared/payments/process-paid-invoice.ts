import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { ParsedWebhookEvent } from './webhook-utils.ts'
import { buildWebhookIdempotencyKey } from './webhook-utils.ts'

type InvoiceRow = {
  id: string
  academy_id: string
  student_id: string
  amount: number
  status: string
  gateway_charge_id: string | null
}

export type ProcessPaidInvoiceResult = {
  processed: boolean
  skipped: boolean
  invoiceId: string | null
  reason?: string
}

export async function processPaidInvoice(
  admin: SupabaseClient,
  event: ParsedWebhookEvent,
  gatewayMetadata: Record<string, unknown>,
): Promise<ProcessPaidInvoiceResult> {
  if (!event.invoiceId) {
    return { processed: false, skipped: true, invoiceId: null, reason: 'missing_invoice_id' }
  }

  const { data: invoice, error: invoiceError } = await admin
    .from('academy_invoices')
    .select('id, academy_id, student_id, amount, status, gateway_charge_id')
    .eq('id', event.invoiceId)
    .maybeSingle()

  if (invoiceError) throw invoiceError
  if (!invoice) {
    return { processed: false, skipped: true, invoiceId: event.invoiceId, reason: 'invoice_not_found' }
  }

  const row = invoice as InvoiceRow

  // 1. Validação de consistência do Charge ID (se a fatura já tiver um charge fixado)
  if (row.gateway_charge_id && event.chargeId && row.gateway_charge_id !== event.chargeId) {
    return {
      processed: false,
      skipped: true,
      invoiceId: row.id,
      reason: 'gateway_charge_mismatch',
    }
  }

  // 2. Validação estrita de valor (prevenção contra pagamentos parciais ou forjados)
  if (event.amountCents != null) {
    const rawAmount = row.amount != null ? Number(row.amount) : NaN
    if (Number.isNaN(rawAmount)) {
      return {
        processed: false,
        skipped: true,
        invoiceId: row.id,
        reason: 'invalid_invoice_amount',
      }
    }
    const expectedCents = Math.round(rawAmount * 100)
    if (event.amountCents !== expectedCents) {
      return {
        processed: false,
        skipped: true,
        invoiceId: row.id,
        reason: 'amount_mismatch',
      }
    }
  }

  const idempotencyKey = buildWebhookIdempotencyKey(event)
  const paymentMethod = event.paymentMethod ?? 'PIX'

  const { data: existingPayment } = await admin
    .from('academy_payments')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingPayment || row.status === 'PAGO') {
    return {
      processed: true,
      skipped: true,
      invoiceId: row.id,
      reason: existingPayment ? 'idempotent_duplicate' : 'already_paid',
    }
  }

  const { error: paymentError } = await admin.from('academy_payments').insert({
    invoice_id: row.id,
    amount: row.amount,
    method: paymentMethod,
    status: 'PAGO',
    paid_at: new Date().toISOString(),
    gateway_payment_id: event.chargeId,
    idempotency_key: idempotencyKey,
    gateway_metadata: {
      ...gatewayMetadata,
      event_type: event.eventType,
      order_id: event.orderId,
      charge_id: event.chargeId,
      amount_cents: event.amountCents,
    },
  })

  if (paymentError) {
    if (paymentError.code === '23505') {
      return {
        processed: true,
        skipped: true,
        invoiceId: row.id,
        reason: 'idempotent_duplicate',
      }
    }
    throw paymentError
  }

  const { error: invoiceUpdateError } = await admin
    .from('academy_invoices')
    .update({
      status: 'PAGO',
      gateway_provider: 'pagarme',
      gateway_charge_id: event.chargeId ?? row.gateway_charge_id,
      gateway_metadata: {
        ...gatewayMetadata,
        paid_at: new Date().toISOString(),
        event_type: event.eventType,
      },
    })
    .eq('id', row.id)

  if (invoiceUpdateError) throw invoiceUpdateError

  const { error: studentUpdateError } = await admin
    .from('students')
    .update({ status: 'ATIVO' })
    .eq('id', row.student_id)

  if (studentUpdateError) throw studentUpdateError

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: null,
    academy_id: row.academy_id,
    action: 'INVOICE_PAID_WEBHOOK',
    entity_type: 'academy_invoices',
    entity_id: row.id,
    metadata: {
      gateway: 'pagarme',
      event_type: event.eventType,
      charge_id: event.chargeId,
      order_id: event.orderId,
      idempotency_key: idempotencyKey,
      payment_method: paymentMethod,
    },
  })

  if (auditError) throw auditError

  return { processed: true, skipped: false, invoiceId: row.id }
}

export async function findInvoiceIdByGatewayCharge(
  admin: SupabaseClient,
  chargeId: string,
): Promise<string | null> {
  const { data } = await admin
    .from('academy_invoices')
    .select('id')
    .eq('gateway_charge_id', chargeId)
    .maybeSingle()

  return data?.id ?? null
}