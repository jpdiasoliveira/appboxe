import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPaymentService } from '../_shared/payments/factory.ts'
import type { ChargeResult, CreateChargeInput } from '../_shared/payments/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type InvoiceRow = {
  id: string
  student_id: string
  amount: number
  due_date: string
  status: string
  gateway_charge_id: string | null
  gateway_metadata: Record<string, unknown> | null
}

function cachedCharge(invoice: InvoiceRow, method: 'PIX' | 'BOLETO'): ChargeResult | null {
  if (!invoice.gateway_charge_id || !invoice.gateway_metadata) return null
  const meta = invoice.gateway_metadata
  const copyPaste =
    typeof meta.copy_paste === 'string'
      ? meta.copy_paste
      : typeof meta.copyPaste === 'string'
        ? meta.copyPaste
        : null
  if (!copyPaste) return null
  const storedMethod = meta.method === 'BOLETO' || meta.method === 'PIX' ? meta.method : null
  if (storedMethod && storedMethod !== method) return null
  return {
    method,
    status: 'PENDENTE',
    copyPaste,
    barcode: typeof meta.barcode === 'string' ? meta.barcode : null,
    qrCodeUrl: typeof meta.qr_code_url === 'string' ? meta.qr_code_url : null,
    boletoUrl: typeof meta.boleto_url === 'string' ? meta.boleto_url : null,
    gatewayProvider: invoice.gateway_charge_id.startsWith('mock_') ? 'mock' : 'pagarme',
    gatewayChargeId: invoice.gateway_charge_id,
    gatewayMetadata: meta,
    message:
      typeof meta.message === 'string'
        ? meta.message
        : 'Cobrança existente reutilizada.',
  }
}

function toResponsePayload(charge: ChargeResult) {
  return {
    method: charge.method,
    status: charge.status,
    copyPaste: charge.copyPaste,
    barcode: charge.barcode ?? null,
    qrCodeUrl: charge.qrCodeUrl ?? null,
    boletoUrl: charge.boletoUrl ?? null,
    gatewayProvider: charge.gatewayProvider,
    gatewayChargeId: charge.gatewayChargeId,
    message: charge.message,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
    } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { invoiceId, method } = await req.json()
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payMethod = method === 'BOLETO' ? 'BOLETO' : 'PIX'

    const { data: invoice } = await supabaseUser
      .from('academy_invoices')
      .select('id, student_id, amount, due_date, status, gateway_charge_id, gateway_metadata')
      .eq('id', invoiceId)
      .maybeSingle()

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Fatura não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const invoiceRow = invoice as InvoiceRow

    if (invoiceRow.status !== 'PENDENTE') {
      return new Response(JSON.stringify({ error: 'Fatura não está pendente' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: student } = await supabaseUser
      .from('students')
      .select('id, user_id, cpf, phone')
      .eq('id', invoiceRow.student_id)
      .maybeSingle()

    if (!student || student.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const existing = cachedCharge(invoiceRow, payMethod)
    if (existing) {
      return new Response(JSON.stringify(toResponsePayload(existing)), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle()

    const amountCents = Math.round(Number(invoiceRow.amount) * 100)
    const chargeInput: CreateChargeInput = {
      invoiceId,
      amountCents,
      description: `Mensalidade ${invoiceId.slice(0, 8)}`,
      dueDate: invoiceRow.due_date,
      customer: {
        name: profile?.name?.trim() || user.email?.split('@')[0] || 'Aluno',
        email: user.email ?? 'aluno@ringpro.dev',
        document: student.cpf,
        phone: student.phone,
      },
    }

    const paymentService = createPaymentService({
      PAYMENTS_MODE: Deno.env.get('PAYMENTS_MODE') ?? undefined,
      PAGARME_API_KEY: Deno.env.get('PAGARME_API_KEY') ?? undefined,
      PAGARME_WEBHOOK_SECRET: Deno.env.get('PAGARME_WEBHOOK_SECRET') ?? undefined,
    })

    const charge =
      payMethod === 'BOLETO'
        ? await paymentService.createBoleto(chargeInput)
        : await paymentService.createPix(chargeInput)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    await admin
      .from('academy_invoices')
      .update({
        gateway_provider: charge.gatewayProvider,
        gateway_charge_id: charge.gatewayChargeId,
        gateway_metadata: {
          ...charge.gatewayMetadata,
          method: charge.method,
          message: charge.message,
        },
      })
      .eq('id', invoiceId)

    return new Response(JSON.stringify(toResponsePayload(charge)), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
