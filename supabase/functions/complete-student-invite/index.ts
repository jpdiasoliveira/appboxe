import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePassword } from '../_shared/password-policy.ts'
import { parseTrialConfig, resolveInitialStudentEnrollment } from '../_shared/trial-policy.ts'
import { normalizePhoneForStorage } from '../_shared/phone.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const {
      token,
      email: bodyEmail,
      name,
      password,
      cpf,
      phone,
      birthDate,
      weightKg,
      heightCm,
      emergencyContactName,
      emergencyContactPhone,
      acceptedTermId,
    } = body

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'token e password são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    const { data: invite, error: invErr } = await admin
      .from('student_invites')
      .select('id, academy_id, email, status, expires_at, lead_id')
      .eq('token', token)
      .maybeSingle()

    if (invErr || !invite) {
      return new Response(JSON.stringify({ error: 'Convite inválido' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (invite.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Este convite já foi utilizado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (new Date(invite.expires_at) < new Date()) {
      await admin.from('student_invites').update({ status: 'EXPIRED' }).eq('id', invite.id)
      return new Response(JSON.stringify({ error: 'Convite expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: activeTerm } = await admin
      .from('academy_terms')
      .select('id')
      .eq('academy_id', invite.academy_id)
      .eq('is_active', true)
      .maybeSingle()

    if (activeTerm && (!acceptedTermId || acceptedTermId !== activeTerm.id)) {
      return new Response(JSON.stringify({ error: 'É necessário aceitar o termo de matrícula para continuar.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resolvedEmail =
      (typeof bodyEmail === 'string' && bodyEmail.trim()
        ? bodyEmail.trim().toLowerCase()
        : invite.email?.trim().toLowerCase()) ?? null

    if (!resolvedEmail) {
      return new Response(JSON.stringify({ error: 'E-mail é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resolvedName =
      typeof name === 'string' && name.trim()
        ? name.trim()
        : resolvedEmail.split('@')[0] || 'Aluno'

    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === resolvedEmail)
    if (existing) {
      return new Response(JSON.stringify({ error: 'E-mail já cadastrado. Faça login ou use outro e-mail.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: authUser, error: userErr } = await admin.auth.admin.createUser({
      email: resolvedEmail,
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

    const { data: academy } = await admin
      .from('academies')
      .select('settings')
      .eq('id', invite.academy_id)
      .single()

    const trialConfig = parseTrialConfig(academy?.settings)
    const enrollment = resolveInitialStudentEnrollment(trialConfig, null)

    const { data: student, error: stErr } = await admin
      .from('students')
      .insert({
        user_id: authUser.user.id,
        academy_id: invite.academy_id,
        cpf: cpf ?? null,
        phone: normalizePhoneForStorage(phone),
        birth_date: birthDate ?? null,
        weight_kg: weightKg ?? null,
        height_cm: heightCm ?? null,
        emergency_contact_name: emergencyContactName ?? null,
        emergency_contact_phone: normalizePhoneForStorage(emergencyContactPhone),
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

    if (activeTerm) {
      const forwarded = req.headers.get('x-forwarded-for')
      const clientIp = forwarded?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null
      const { error: termErr } = await admin.from('student_term_acceptances').insert({
        student_id: student.id,
        term_id: activeTerm.id,
        academy_id: invite.academy_id,
        client_ip: clientIp,
      })
      if (termErr) {
        return new Response(JSON.stringify({ error: termErr.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    await admin.from('user_academy_roles').insert({
      user_id: authUser.user.id,
      academy_id: invite.academy_id,
      role: 'STUDENT',
      status: 'ATIVO',
    })

    await admin
      .from('student_invites')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        email: resolvedEmail,
      })
      .eq('id', invite.id)

    if (invite.lead_id) {
      await admin.from('leads').update({ status: 'CONVERTIDO' }).eq('id', invite.lead_id)
    }

    return new Response(
      JSON.stringify({ studentId: student.id, email: resolvedEmail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
