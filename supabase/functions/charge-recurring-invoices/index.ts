import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createPaymentService } from '../_shared/payments/factory.ts'
import {
  processRecurringCardFailure,
  processRecurringCardSuccess,
} from '../_shared/payments/process-recurring-card-charge.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ChargeJob = {
  subscription_id: string
  invoice_id: string
  student_id: string
  academy_id: string
  amount: number
  due_date: string
  charge_attempt_count: number
  next_charge_retry_date: string | null
  payment_method_id: string
  gateway: string
  gateway_token: string
  brand: string | null
  last_four: string | null
  customer_name: string
  customer_email: string
  customer_document: string | null
  customer_phone: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const authHeader = req.headers.get('Authorization')
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCron) {
      const supabaseUser = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader ?? '' } } },
      )
      const {
        data: { user },
      } = await supabaseUser.auth.getUser()
      const { data: isOwner } = await supabaseUser.rpc('is_platform_owner')
      if (!user || !isOwner) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: jobs, error: jobsError } = await admin.rpc('list_recurring_card_charge_jobs')
    if (jobsError) {
      return new Response(JSON.stringify({ error: jobsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentService = createPaymentService({
      PAYMENTS_MODE: Deno.env.get('PAYMENTS_MODE') ?? undefined,
      PAGARME_API_KEY: Deno.env.get('PAGARME_API_KEY') ?? undefined,
      PAGARME_WEBHOOK_SECRET: Deno.env.get('PAGARME_WEBHOOK_SECRET') ?? undefined,
    })

    const summary = {
      jobs: (jobs ?? []).length,
      paid: 0,
      failed: 0,
      pending: 0,
      errors: [] as string[],
    }

    for (const rawJob of (jobs ?? []) as ChargeJob[]) {
      const attemptNumber = rawJob.charge_attempt_count + 1
      try {
        const charge = await paymentService.chargeCard({
          invoiceId: rawJob.invoice_id,
          amountCents: Math.round(Number(rawJob.amount) * 100),
          description: `Mensalidade ${rawJob.due_date}`,
          dueDate: rawJob.due_date,
          cardToken: rawJob.gateway_token,
          customer: {
            name: rawJob.customer_name,
            email: rawJob.customer_email,
            document: rawJob.customer_document,
            phone: rawJob.customer_phone,
          },
        })

        if (charge.status === 'PAGO') {
          await processRecurringCardSuccess(
            admin,
            rawJob.invoice_id,
            rawJob.subscription_id,
            charge,
            attemptNumber,
          )
          summary.paid += 1
        } else if (charge.status === 'FALHOU') {
          await processRecurringCardFailure(
            admin,
            rawJob.invoice_id,
            rawJob.subscription_id,
            charge,
            attemptNumber,
          )
          summary.failed += 1
        } else {
          summary.pending += 1
        }
      } catch (jobError) {
        summary.errors.push(`${rawJob.invoice_id}: ${String(jobError)}`)
      }
    }

    await admin.rpc('apply_academy_dunning')

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
