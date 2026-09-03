import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePassword } from '../_shared/password-policy.ts'
import { parseTrialConfig, resolveInitialStudentEnrollment } from '../_shared/trial-policy.ts'
import { normalizePhoneForStorage } from '../_shared/phone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function isSelfRegisterEnabled(
  admin: ReturnType<typeof createClient>,
  academyId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('academy_feature_flags')
    .select('enabled')
    .eq('academy_id', academyId)
    .eq('flag_key', 'module_student_self_register')
    .maybeSingle()

  return data?.enabled === true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { academyId, slug, email, name, password, phone } = body

    if ((!academyId && !slug) || !email || !name || !password) {
      return new Response(
        JSON.stringify({ error: 'academyId ou slug, email, name e password são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let resolvedAcademyId = academyId as string | undefined
    if (!resolvedAcademyId && slug) {
      const { data: academy } = await admin
        .from('academies')
        .select('id, status')
        .eq('slug', String(slug).trim())
        .maybeSingle()

      if (!academy || academy.status !== 'ATIVO') {
        return new Response(JSON.stringify({ error: 'Academia não encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      resolvedAcademyId = academy.id
    }

    const { data: academyRow } = await admin
      .from('academies')
      .select('id, status, settings')
      .eq('id', resolvedAcademyId!)
      .single()

    if (!academyRow || academyRow.status !== 'ATIVO') {
      return new Response(JSON.stringify({ error: 'Academia indisponível' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!(await isSelfRegisterEnabled(admin, academyRow.id))) {
      return new Response(JSON.stringify({ error: 'Cadastro público desativado nesta academia' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const resolvedName = String(name).trim()

    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)
    if (existing) {
      return new Response(JSON.stringify({ error: 'E-mail já cadastrado. Faça login.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: authUser, error: userErr } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: resolvedName },
    })

    if (userErr) {
      return new Response(JSON.stringify({ error: userErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('profiles').upsert({
      user_id: authUser.user.id,
      name: resolvedName,
      must_change_password: false,
    })

    const trialConfig = parseTrialConfig(academyRow.settings)
    const enrollment = resolveInitialStudentEnrollment(trialConfig, null)

    const { data: student, error: stErr } = await admin
      .from('students')
      .insert({
        user_id: authUser.user.id,
        academy_id: academyRow.id,
        phone: normalizePhoneForStorage(phone),
        status: enrollment.status,
        trial_ends_at: enrollment.trial_ends_at,
      })
      .select('id')
      .single()

    if (stErr) {
      return new Response(JSON.stringify({ error: stErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('user_academy_roles').insert({
      user_id: authUser.user.id,
      academy_id: academyRow.id,
      role: 'STUDENT',
      status: 'ATIVO',
    })

    return new Response(
      JSON.stringify({
        studentId: student.id,
        email: normalizedEmail,
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
