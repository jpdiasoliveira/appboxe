import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  resolveInviteBaseUrl,
  sendStudentInviteEmail,
  type InviteEmailMode,
} from '../_shared/invite-email.ts'
import { sendStudentInvitePush } from '../_shared/push/dispatch.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { academyId, inviteId, inviteBaseUrl } = body

    if (!academyId || !inviteId) {
      return new Response(JSON.stringify({ error: 'academyId e inviteId são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: isStaff } = await supabaseUser.rpc('is_academy_staff', { p_academy_id: academyId })
    const { data: isOwner } = await supabaseUser.rpc('is_platform_owner')
    if (!isStaff && !isOwner) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: invite, error: inviteError } = await admin
      .from('student_invites')
      .select('id, email, token, status, academy_id')
      .eq('id', inviteId)
      .eq('academy_id', academyId)
      .single()

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (invite.status !== 'PENDING') {
      return new Response(JSON.stringify({ error: 'Convite não está pendente' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expires = new Date()
    expires.setDate(expires.getDate() + 7)
    const expiresAt = expires.toISOString()

    const { error: updateError } = await admin
      .from('student_invites')
      .update({ expires_at: expiresAt })
      .eq('id', invite.id)

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: academy } = await admin
      .from('academies')
      .select('name')
      .eq('id', invite.academy_id)
      .single()

    let emailMode: InviteEmailMode = 'skipped'
    let emailMessage: string | undefined

    if (await isEmailNotificationsEnabled(admin, academyId)) {
      const academyName = academy?.name ?? 'sua academia'
      const baseUrl = resolveInviteBaseUrl(inviteBaseUrl)
      const result = await sendStudentInviteEmail({
        toEmail: invite.email,
        academyName,
        inviteUrl: `${baseUrl}/convite/${invite.token}`,
        expiresAt,
      })
      emailMode = result.mode
      emailMessage = result.message
    } else {
      emailMessage = 'E-mails desativados para esta academia (module_notifications_email)'
    }

    let pushSent = 0
    if (invite.email) {
      try {
        const pushResult = await sendStudentInvitePush(admin, {
          academyId,
          email: invite.email,
          academyName: academy?.name ?? 'sua academia',
          token: invite.token,
        })
        pushSent = pushResult?.sent ?? 0
      } catch (pushError) {
        console.error('[resend-student-invite] push falhou:', pushError)
      }
    }

    return new Response(
      JSON.stringify({
        token: invite.token,
        expiresAt,
        emailMode,
        emailMessage,
        pushSent,
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
