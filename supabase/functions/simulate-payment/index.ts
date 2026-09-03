import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Trava estrutural de ambiente: Bloqueia totalmente em produção
  const paymentsMode = Deno.env.get('PAYMENTS_MODE') ?? 'live'
  const allowSimulate = Deno.env.get('ALLOW_SIMULATE_PAYMENT') === 'true'

  if (paymentsMode !== 'mock' && !allowSimulate) {
    return new Response(
      JSON.stringify({ error: 'Operação indisponível neste ambiente.' }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
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

    const { invoiceId } = await req.json()
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'invoiceId obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: invoice } = await supabaseUser
      .from('academy_invoices')
      .select('id, student_id, status, amount')
      .eq('id', invoiceId)
      .maybeSingle()

    if (!invoice) {
      return new Response(JSON.stringify({ error: 'Fatura não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: student } = await supabaseUser
      .from('students')
      .select('id, user_id')
      .eq('id', invoice.student_id)
      .maybeSingle()

    if (!student || student.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    await admin
      .from('academy_invoices')
      .update({ status: 'PAGO' })
      .eq('id', invoiceId)

    await admin.from('academy_payments').insert({
      invoice_id: invoiceId,
      amount: invoice.amount,
      method: 'PIX',
      status: 'PAGO',
      paid_at: new Date().toISOString(),
    })

    await admin.from('students').update({ status: 'ATIVO' }).eq('id', student.id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})