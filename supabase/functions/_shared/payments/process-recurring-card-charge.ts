import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { CardChargeResult } from './types.ts'
import { buildRecurringIdempotencyKey } from './recurring-billing.ts'

type InvoiceRow = {
  id: string
  academy_id: string
  student_id: string
  student_subscription_id: string | null
  amount: number
  status: string
  charge_attempt_count: number
}

export type ProcessRecurringCardResult = {
  success: boolean
  invoiceId: string
  reason?: string
}

export async function processRecurringCardSuccess(
  admin: SupabaseClient,
  invoiceId: string,
  subscriptionId: string,
  charge: CardChargeResult,
  attemptNumber: number,
): Promise<ProcessRecurringCardResult> {
  const { data: invoice, error: invoiceError } = await admin
    .from('academy_invoices')
    .select('id, academy_id, student_id, student_subscription_id, amount, status, charge_attempt_count')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invoiceError) throw invoiceError
  if (!invoice) {
    return { success: false, invoiceId, reason: 'invoice_not_found' }
  }

  const row = invoice as InvoiceRow
  if (row.status === 'PAGO') {
    return { success: true, invoiceId, reason: 'already_paid' }
  }

  const idempotencyKey = buildRecurringIdempotencyKey(invoiceId, attemptNumber)

  const { data: existingPayment } = await admin
    .from('academy_payments')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (!existingPayment) {
    const { error: paymentError } = await admin.from('academy_payments').insert({
      invoice_id: invoiceId,
      amount: row.amount,
      method: 'CARTAO',
      status: 'PAGO',
      paid_at: new Date().toISOString(),
      gateway_payment_id: charge.gatewayChargeId,
      idempotency_key: idempotencyKey,
      gateway_metadata: charge.gatewayMetadata,
    })

    if (paymentError && paymentError.code !== '23505') {
      throw paymentError
    }
  }

  const { error: invoiceUpdateError } = await admin
    .from('academy_invoices')
    .update({
      status: 'PAGO',
      gateway_provider: charge.gatewayProvider,
      gateway_charge_id: charge.gatewayChargeId,
      gateway_metadata: charge.gatewayMetadata,
      last_charge_attempt_at: new Date().toISOString(),
      next_charge_retry_date: null,
    })
    .eq('id', invoiceId)

  if (invoiceUpdateError) throw invoiceUpdateError

  const { error: studentUpdateError } = await admin
    .from('students')
    .update({ status: 'ATIVO' })
    .eq('id', row.student_id)

  if (studentUpdateError) throw studentUpdateError

  const { error: advanceError } = await admin.rpc('advance_student_subscription_billing', {
    p_subscription_id: subscriptionId,
  })
  if (advanceError) throw advanceError

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: null,
    academy_id: row.academy_id,
    action: 'RECURRING_CARD_CHARGE_SUCCESS',
    entity_type: 'academy_invoices',
    entity_id: invoiceId,
    metadata: {
      subscription_id: subscriptionId,
      gateway: charge.gatewayProvider,
      charge_id: charge.gatewayChargeId,
      idempotency_key: idempotencyKey,
      attempt_number: attemptNumber,
    },
  })
  if (auditError) throw auditError

  return { success: true, invoiceId }
}

export async function processRecurringCardFailure(
  admin: SupabaseClient,
  invoiceId: string,
  subscriptionId: string,
  charge: CardChargeResult,
  attemptNumber: number,
): Promise<ProcessRecurringCardResult> {
  const { data: failureMeta, error: failureError } = await admin.rpc(
    'record_recurring_card_charge_failure',
    { p_invoice_id: invoiceId },
  )
  if (failureError) throw failureError

  const { data: invoice } = await admin
    .from('academy_invoices')
    .select('academy_id')
    .eq('id', invoiceId)
    .maybeSingle()

  if (invoice?.academy_id) {
    await admin.from('audit_logs').insert({
      user_id: null,
      academy_id: invoice.academy_id,
      action: 'RECURRING_CARD_CHARGE_FAILED',
      entity_type: 'academy_invoices',
      entity_id: invoiceId,
      metadata: {
        subscription_id: subscriptionId,
        gateway: charge.gatewayProvider,
        attempt_number: attemptNumber,
        message: charge.message,
        failure: failureMeta,
      },
    })
  }

  return { success: false, invoiceId, reason: charge.message }
}
