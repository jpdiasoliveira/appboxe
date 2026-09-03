import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendFcmToTokens } from './fcm.ts'

export type PushPlatform = 'android' | 'ios' | 'web'

export interface PushMessageInput {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

export interface PushDispatchResult {
  sent: number
  failed: number
  invalidTokens: string[]
  skipped: boolean
  tokenCount: number
}

export async function isPushEnabled(
  admin: SupabaseClient,
  academyId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('academy_feature_flags')
    .select('enabled')
    .eq('academy_id', academyId)
    .eq('flag_key', 'module_notifications_push')
    .maybeSingle()

  if (!data) return false
  return data.enabled === true
}

export async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase()
  const { data: list } = await admin.auth.admin.listUsers()
  const user = list?.users?.find((u) => u.email?.toLowerCase() === normalized)
  return user?.id ?? null
}

export async function pushToUser(
  admin: SupabaseClient,
  input: PushMessageInput,
): Promise<PushDispatchResult> {
  const { data: rows, error } = await admin
    .from('push_device_tokens')
    .select('token')
    .eq('user_id', input.userId)

  if (error) {
    throw new Error(error.message)
  }

  const tokens = (rows ?? []).map((row) => row.token as string)
  const serverKey = Deno.env.get('FCM_SERVER_KEY')
  const result = await sendFcmToTokens(serverKey, tokens, {
    title: input.title,
    body: input.body,
    data: input.data,
  })

  if (result.invalidTokens.length > 0) {
    await admin.from('push_device_tokens').delete().in('token', result.invalidTokens)
  }

  return {
    sent: result.sent,
    failed: result.failed,
    invalidTokens: result.invalidTokens,
    skipped: result.skipped,
    tokenCount: tokens.length,
  }
}

export function invoicePushPath(): string {
  return '/student/pagamento'
}

export function invitePushPath(token: string): string {
  return `/convite/${token}`
}

export interface InvoicePushRpcMessage {
  user_id: string
  academy_id: string
  title: string
  body: string | null
  kind: string
  reference_id: string
}

export async function dispatchInvoicePushMessages(
  admin: SupabaseClient,
  messages: InvoicePushRpcMessage[],
): Promise<{ sent: number; skippedAcademies: number }> {
  if (messages.length === 0) {
    return { sent: 0, skippedAcademies: 0 }
  }

  const academyIds = [...new Set(messages.map((m) => m.academy_id))]
  const enabledAcademies = new Set<string>()
  let skippedAcademies = 0

  for (const academyId of academyIds) {
    if (await isPushEnabled(admin, academyId)) {
      enabledAcademies.add(academyId)
    } else {
      skippedAcademies += 1
    }
  }

  let sent = 0
  for (const message of messages) {
    if (!enabledAcademies.has(message.academy_id)) continue

    const result = await pushToUser(admin, {
      userId: message.user_id,
      title: message.title,
      body: message.body ?? '',
      data: {
        path: invoicePushPath(),
        kind: message.kind,
        reference_id: message.reference_id,
      },
    })
    sent += result.sent
  }

  return { sent, skippedAcademies }
}

export async function sendStudentInvitePush(
  admin: SupabaseClient,
  input: {
    academyId: string
    email: string
    academyName: string
    token: string
  },
): Promise<PushDispatchResult | null> {
  if (!(await isPushEnabled(admin, input.academyId))) {
    return null
  }

  const userId = await findUserIdByEmail(admin, input.email)
  if (!userId) {
    return null
  }

  return pushToUser(admin, {
    userId,
    title: 'Convite de matrícula',
    body: `${input.academyName} enviou um convite para você concluir a matrícula.`,
    data: {
      path: invitePushPath(input.token),
      kind: 'student_invite',
      token: input.token,
    },
  })
}

export type AdminClient = ReturnType<typeof createClient>
