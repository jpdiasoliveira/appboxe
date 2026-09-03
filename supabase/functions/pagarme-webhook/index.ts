import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { resolvePaymentsMode } from '../_shared/payments/factory.ts'
import { findInvoiceIdByGatewayCharge, processPaidInvoice } from '../_shared/payments/process-paid-invoice.ts'
import {
  extractSignatureHeader,
  parsePagarmeWebhookBody,
  verifyPagarmeWebhookSignature,
} from '../_shared/payments/webhook-utils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-pagarme-signature, x-hub-signature, x-hub-signature-256',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const rawBody = await req.text()
    const webhookSecret = Deno.env.get('PAGARME_WEBHOOK_SECRET') ?? ''
    const paymentsMode = resolvePaymentsMode({
      PAYMENTS_MODE: Deno.env.get('PAYMENTS_MODE') ?? undefined,
      PAGARME_API_KEY: Deno.env.get('PAGARME_API_KEY') ?? undefined,
    })

    // 1. Hardening em modo LIVE: Secret é obrigatório
    if (paymentsMode === 'live') {
      if (!webhookSecret.trim()) {
        console.error('ERRO CRÍTICO: PAGARME_WEBHOOK_SECRET ausente no ambiente live.')
        return new Response(
          JSON.stringify({ error: 'Configuração de webhook incompleta no servidor' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // 2. Validação obrigatória da assinatura HMAC
      const signature = extractSignatureHeader(req)
      const valid = await verifyPagarmeWebhookSignature(rawBody, signature, webhookSecret)
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Assinatura inválida' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
      return new Response(JSON.stringify({ error: 'Payload inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const event = parsePagarmeWebhookBody(body)
    if (!event) {
      return new Response(JSON.stringify({ received: true, skipped: true, reason: 'unparsed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!event.paid) {
      return new Response(
        JSON.stringify({ received: true, skipped: true, reason: 'ignored_event', event: event.eventType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let invoiceId = event.invoiceId
    if (!invoiceId && event.chargeId) {
      invoiceId = await findInvoiceIdByGatewayCharge(admin, event.chargeId)
      if (invoiceId) event.invoiceId = invoiceId
    }

    const result = await processPaidInvoice(admin, event, {
      webhook_event_id: event.eventId,
      webhook_event_type: event.eventType,
    })

    return new Response(
      JSON.stringify({
        received: true,
        processed: result.processed,
        skipped: result.skipped,
        invoiceId: result.invoiceId,
        reason: result.reason ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})