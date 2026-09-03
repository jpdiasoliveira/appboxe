import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  parseTrialConfig,
  resolveInitialStudentEnrollment,
  type EnrollmentStatus,
} from '../_shared/trial-policy.ts'
import { normalizePhoneForStorage } from '../_shared/phone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFF_ROLES = ['SCHOOL_OWNER', 'PROFESSOR', 'ASSISTANT']

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

    const body = await req.json()
    const { academyId, email, name, cpf, phone, initialStatus } = body

    if (!academyId || !email || !name) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: academyId, email, name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isStaff } = await supabaseUser.rpc('is_academy_staff', { p_academy_id: academyId })
    const { data: isOwner } = await supabaseUser.rpc('is_platform_owner')
    if (!isStaff && !isOwner) {
      return new Response(JSON.stringify({ error: 'Sem permissão nesta academia' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: list } = await admin.auth.admin.listUsers()
    let authUser = list?.users?.find((u) => u.email === email)

    if (!authUser) {
      const { data, error: userErr } = await admin.auth.admin.createUser({
        email,
        password: 'RingPro@dev123',
        email_confirm: true,
        user_metadata: { name },
      })
      if (userErr) {
        return new Response(JSON.stringify({ error: userErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      authUser = data.user
    }

    await admin.from('profiles').upsert({
      user_id: authUser.id,
      name,
      must_change_password: true,
    })

    const { data: academy } = await admin
      .from('academies')
      .select('settings')
      .eq('id', academyId)
      .single()

    const trialConfig = parseTrialConfig(academy?.settings)
    const manualStatus: EnrollmentStatus | null =
      initialStatus === 'TRIAL' || initialStatus === 'ATIVO' ? initialStatus : null
    const enrollment = resolveInitialStudentEnrollment(trialConfig, manualStatus)

    const { data: student, error: stErr } = await admin
      .from('students')
      .upsert(
        {
          user_id: authUser.id,
          academy_id: academyId,
          cpf: cpf ?? null,
          phone: normalizePhoneForStorage(phone),
          status: enrollment.status,
          trial_ends_at: enrollment.trial_ends_at,
        },
        { onConflict: 'user_id,academy_id' },
      )
      .select('id')
      .single()

    if (stErr) {
      return new Response(JSON.stringify({ error: stErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('user_academy_roles').upsert(
      {
        user_id: authUser.id,
        academy_id: academyId,
        role: 'STUDENT',
        status: 'ATIVO',
      },
      { onConflict: 'user_id,academy_id,role' },
    )

    return new Response(JSON.stringify({ studentId: student.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
