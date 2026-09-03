import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { validatePassword } from '../_shared/password-policy.ts'

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
    const { token, name, password } = body

    if (!token || !name || !password) {
      return new Response(JSON.stringify({ error: 'token, name e password são obrigatórios' }), {
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
      .from('staff_invites')
      .select('id, academy_id, email, role, status, expires_at')
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
      await admin.from('staff_invites').update({ status: 'EXPIRED' }).eq('id', invite.id)
      return new Response(JSON.stringify({ error: 'Convite expirado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: list } = await admin.auth.admin.listUsers()
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === invite.email.toLowerCase())
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'E-mail já cadastrado. Faça login ou peça um novo convite ao dono da academia.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: authUser, error: userErr } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { name },
    })

    if (userErr) {
      return new Response(JSON.stringify({ error: userErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await admin.from('profiles').upsert({
      user_id: authUser.user.id,
      name,
      must_change_password: false,
    })

    await admin.from('user_academy_roles').insert({
      user_id: authUser.user.id,
      academy_id: invite.academy_id,
      role: invite.role,
      status: 'ATIVO',
    })

    await admin.from('instructors').upsert(
      {
        user_id: authUser.user.id,
        academy_id: invite.academy_id,
        status: 'ATIVO',
      },
      { onConflict: 'user_id,academy_id' },
    )

    await admin
      .from('staff_invites')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('id', invite.id)

    return new Response(
      JSON.stringify({ userId: authUser.user.id, email: invite.email, role: invite.role }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
