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
    const { academyId, email, leadId, inviteBaseUrl, prefillName } = body

    if (!academyId) {
      return new Response(JSON.stringify({ error: 'academyId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedEmail =
      typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null

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

    const expires = new Date()
    expires.setDate(expires.getDate() + 7)

    let resolvedPrefillName =
      typeof prefillName === 'string' && prefillName.trim() ? prefillName.trim() : null

    if (!resolvedPrefillName && leadId) {
      const { data: lead } = await admin
        .from('leads')
        .select('name')
        .eq('id', leadId)
        .maybeSingle()
      if (lead?.name?.trim()) {
        resolvedPrefillName = lead.name.trim()
      }
    }

    const { data: invite, error } = await admin
      .from('student_invites')
      .insert({
        academy_id: academyId,
        email: normalizedEmail,
        invited_by: user.id,
        lead_id: leadId ?? null,
        prefill_name: resolvedPrefillName,
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

    if (leadId) {
      await admin
        .from('leads')
        .update({ status: 'CONVITE_ENVIADO' })
        .eq('id', leadId)
        .eq('academy_id', academyId)
        .in('status', ['NOVO'])
    }

    const expiresAt = expires.toISOString()
    const baseUrl = resolveInviteBaseUrl(inviteBaseUrl)
    const link = `${baseUrl}/convite/${invite.token}`

    let emailMode: InviteEmailMode = 'skipped'
    let emailMessage: string | undefined

    if (normalizedEmail && (await isEmailNotificationsEnabled(admin, academyId))) {
      try {
        const result = await sendStudentInviteEmail({
          toEmail: normalizedEmail,
          academyName: academy.name,
          inviteUrl: link,
          expiresAt,
        })
        emailMode = result.mode
        emailMessage = result.message
      } catch (emailError) {
        console.error('[create-student-invite] e-mail falhou:', emailError)
        emailMessage = emailError instanceof Error ? emailError.message : String(emailError)
      }
    } else {
      emailMessage = 'E-mails desativados para esta academia (module_notifications_email)'
    }

    let pushSent = 0
    if (normalizedEmail) {
      try {
        const pushResult = await sendStudentInvitePush(admin, {
          academyId,
          email: normalizedEmail,
          academyName: academy.name,
          token: invite.token,
        })
        pushSent = pushResult?.sent ?? 0
      } catch (pushError) {
        console.error('[create-student-invite] push falhou:', pushError)
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
