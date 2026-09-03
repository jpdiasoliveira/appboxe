import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  resolveInviteBaseUrl,
  sendStaffInviteEmail,
  type InviteEmailMode,
} from '../_shared/invite-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['PROFESSOR', 'ASSISTANT'] as const

async function isEmailNotificationsEnabled(
  admin: ReturnType<typeof createClient>,
  academyId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('academy_feature_flags')
    .select('enabled')
    .eq('academy_id', academyId)
    .eq('flag_key', 'module_notifications_email')
    .maybeSingle()

  if (!data) return true
  return data.enabled === true
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

    const body = await req.json()
    const { academyId, email, role, inviteBaseUrl } = body

    if (!academyId || !email || !role) {
      return new Response(JSON.stringify({ error: 'academyId, email e role são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: 'role deve ser PROFESSOR ou ASSISTANT' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isSchoolOwner } = await supabaseUser.rpc('has_academy_role', {
      p_academy_id: academyId,
      p_roles: ['SCHOOL_OWNER'],
    })
    const { data: isPlatformOwner } = await supabaseUser.rpc('is_platform_owner')
    if (!isSchoolOwner && !isPlatformOwner) {
      return new Response(JSON.stringify({ error: 'Apenas o dono da academia pode convidar equipe' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: academy, error: academyError } = await admin
      .from('academies')
      .select('name')
      .eq('id', academyId)
      .single()

    if (academyError || !academy) {
      return new Response(JSON.stringify({ error: 'Academia não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)

    const { data: invite, error } = await admin
      .from('staff_invites')
      .insert({
        academy_id: academyId,
        email: normalizedEmail,
        role,
        invited_by: user.id,
        status: 'PENDING',
        expires_at: expires.toISOString(),
      })
      .select('token')
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = expires.toISOString()
    const baseUrl = resolveInviteBaseUrl(inviteBaseUrl)
    const link = `${baseUrl}/convite-equipe/${invite.token}`

    let emailMode: InviteEmailMode = 'skipped'
    let emailMessage: string | undefined

    if (await isEmailNotificationsEnabled(admin, academyId)) {
      try {
        const result = await sendStaffInviteEmail({
          toEmail: normalizedEmail,
          academyName: academy.name,
          inviteUrl: link,
          expiresAt,
          role,
        })
        emailMode = result.mode
        emailMessage = result.message
      } catch (emailError) {
        console.error('[create-staff-invite] e-mail falhou:', emailError)
        emailMessage = emailError instanceof Error ? emailError.message : String(emailError)
      }
    } else {
      emailMessage = 'E-mails desativados para esta academia (module_notifications_email)'
    }

    return new Response(
      JSON.stringify({
        token: invite.token,
        expiresAt,
        emailMode,
        emailMessage,
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
