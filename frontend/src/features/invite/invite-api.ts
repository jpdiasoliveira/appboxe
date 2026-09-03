import { supabase } from '../../lib/supabase'
import { normalizePhoneForStorage } from '../../lib/phone-utils'

export interface PublicInviteTerm {
  id: string
  version: number
  title: string
  content_html: string
}

export interface PublicInviteContract {
  id: string
  title: string
  original_filename: string | null
}

export interface PublicInviteInfo {
  valid: boolean
  reason?: string
  email?: string | null
  academy_name?: string
  academy_slug?: string
  expires_at?: string
  prefill_name?: string | null
  term?: PublicInviteTerm | null
  contract?: PublicInviteContract | null
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/convite/${token}`
}

export async function fetchPublicInvite(token: string): Promise<PublicInviteInfo> {
  const { data, error } = await supabase.rpc('get_public_student_invite', { p_token: token })
  if (error) throw error
  return data as PublicInviteInfo
}

export async function fetchInviteContractUrl(token: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('public-invite-contract-url', {
    body: { token },
  })

  if (error) throw error
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    throw new Error(data.error)
  }
  if (!data || typeof data !== 'object' || typeof (data as { signedUrl?: string }).signedUrl !== 'string') {
    throw new Error('Não foi possível abrir o contrato.')
  }
  return (data as { signedUrl: string }).signedUrl
}

export interface CreateStudentInviteResult {
  token: string
  expiresAt: string
  emailMode?: 'sent' | 'stub' | 'skipped'
  emailMessage?: string
}

export function inviteEmailStatusLabel(result: CreateStudentInviteResult, email?: string): string {
  if (!email) {
    return 'Link gerado — copie e envie por WhatsApp, e-mail ou SMS. O aluno preenche tudo ao abrir.'
  }
  if (result.emailMode === 'sent') {
    return `E-mail enviado para ${email}.`
  }
  if (result.emailMode === 'stub') {
    return 'E-mail em modo dev (sem RESEND_API_KEY). Copie o link abaixo ou veja o log da Edge Function.'
  }
  if (result.emailMode === 'skipped') {
    return result.emailMessage ?? 'E-mails desativados nesta academia. Envie o link manualmente.'
  }
  return 'Link gerado — envie por WhatsApp ou e-mail se necessário.'
}

async function parseEdgeFunctionError(error: unknown, data: unknown): Promise<Error> {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return new Error(data.error)
  }
  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      try {
        const body = (await ctx.json()) as { error?: string }
        if (body.error) {
          if (body.error.includes('null value in column "email"')) {
            return new Error(
              'Banco desatualizado — rode: node scripts/apply-db-remote.mjs (migration do link aberto).',
            )
          }
          return new Error(body.error)
        }
      } catch {
        // ignore parse failure
      }
    }
  }
  if (error instanceof Error) return error
  return new Error('Erro ao chamar o servidor')
}

export async function createStudentInvite(
  academyId: string,
  options?: { email?: string; leadId?: string; prefillName?: string },
) {
  const { data, error } = await supabase.functions.invoke('create-student-invite', {
    body: {
      academyId,
      email: options?.email?.trim() || undefined,
      leadId: options?.leadId,
      prefillName: options?.prefillName,
      inviteBaseUrl: window.location.origin,
    },
  })
  if (error || data?.error) {
    throw await parseEdgeFunctionError(error, data)
  }
  return data as CreateStudentInviteResult
}

export async function resendStudentInviteEmail(academyId: string, token: string) {
  const { data, error } = await supabase.functions.invoke('send-student-invite-email', {
    body: {
      academyId,
      token,
      inviteBaseUrl: window.location.origin,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { emailMode: 'sent' | 'stub' | 'skipped'; emailMessage?: string }
}

export interface PendingStudentInvite {
  id: string
  email: string | null
  token: string
  prefill_name: string | null
  status: string
  expires_at: string
  created_at: string
  lead_id: string | null
}

export async function fetchPendingStudentInvites(academyId: string): Promise<PendingStudentInvite[]> {
  const { data, error } = await supabase
    .from('student_invites')
    .select('id, email, token, prefill_name, status, expires_at, created_at, lead_id')
    .eq('academy_id', academyId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as PendingStudentInvite[]
}

export async function cancelStudentInvite(academyId: string, inviteId: string) {
  const { data, error } = await supabase
    .from('student_invites')
    .update({ status: 'CANCELLED' })
    .eq('id', inviteId)
    .eq('academy_id', academyId)
    .eq('status', 'PENDING')
    .select('id')
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Convite não encontrado ou já não está pendente')
}

export interface ResendStudentInviteResult {
  token: string
  expiresAt: string
  emailMode?: 'sent' | 'stub' | 'skipped'
  emailMessage?: string
}

export async function resendStudentInvite(academyId: string, inviteId: string) {
  const { data, error } = await supabase.functions.invoke('resend-student-invite', {
    body: {
      academyId,
      inviteId,
      inviteBaseUrl: window.location.origin,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as ResendStudentInviteResult
}

export interface CompleteInviteInput {
  token: string
  email?: string
  name?: string
  password: string
  cpf?: string
  phone?: string
  birthDate?: string
  weightKg?: number
  heightCm?: number
  emergencyContactName?: string
  emergencyContactPhone?: string
  acceptedTermId?: string
}

export async function completeStudentInvite(input: CompleteInviteInput) {
  const { data, error } = await supabase.functions.invoke('complete-student-invite', {
    body: {
      token: input.token,
      email: input.email,
      name: input.name,
      password: input.password,
      cpf: input.cpf,
      phone: normalizePhoneForStorage(input.phone),
      birthDate: input.birthDate,
      weightKg: input.weightKg,
      heightCm: input.heightCm,
      emergencyContactName: input.emergencyContactName,
      emergencyContactPhone: normalizePhoneForStorage(input.emergencyContactPhone),
      acceptedTermId: input.acceptedTermId,
    },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { studentId: string; email: string }
}
