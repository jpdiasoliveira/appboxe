import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_FLAGS = [
  { key: 'module_payments_card', enabled: true },
  { key: 'module_payments_pix', enabled: true },
  { key: 'module_payments_boleto', enabled: true },
  { key: 'module_attendance', enabled: true },
  { key: 'module_landing', enabled: true },
  { key: 'module_trial', enabled: false },
  { key: 'module_notifications_email', enabled: true },
  { key: 'module_student_self_register', enabled: false },
  { key: 'module_class_schedule', enabled: true },
]

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

    const { data: isOwner } = await supabaseUser.rpc('is_platform_owner')
    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Apenas PLATFORM_OWNER' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { name, slug, saasPlanId, ownerEmail, ownerName } = body

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: academy, error: acErr } = await admin
      .from('academies')
      .insert({
        name,
        slug,
        saas_plan_id: saasPlanId,
        status: 'ATIVO',
        settings: { onboarding_completed: false },
      })
      .select('id')
      .single()

    if (acErr) {
      return new Response(JSON.stringify({ error: acErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const flags = DEFAULT_FLAGS.map((f) => ({
      academy_id: academy.id,
      flag_key: f.key,
      enabled: f.enabled,
    }))
    await admin.from('academy_feature_flags').insert(flags)

    const { data: authUser, error: userErr } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: 'RingPro@dev123',
      email_confirm: true,
      user_metadata: { name: ownerName },
    })

    if (userErr) {
      return new Response(
        JSON.stringify({ error: userErr.message, academyId: academy.id }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    await admin.from('profiles').upsert({
      user_id: authUser.user.id,
      name: ownerName,
      must_change_password: true,
    })

    await admin.from('user_academy_roles').insert({
      user_id: authUser.user.id,
      academy_id: academy.id,
      role: 'SCHOOL_OWNER',
      status: 'ATIVO',
    })

    const plan = await admin.from('saas_plans').select('price_monthly').eq('id', saasPlanId).single()
    const amount = plan.data?.price_monthly ?? 99
    const due = new Date()
    due.setDate(due.getDate() + 10)
    await admin.from('saas_invoices').insert({
      academy_id: academy.id,
      amount,
      due_date: due.toISOString().slice(0, 10),
      status: 'PENDENTE',
    })

    return new Response(JSON.stringify({ academyId: academy.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
