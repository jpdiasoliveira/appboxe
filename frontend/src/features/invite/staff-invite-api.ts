import { supabase } from '../../lib/supabase'
import { inviteEmailStatusLabel, type CreateStudentInviteResult } from './invite-api'

export type StaffInviteRole = 'PROFESSOR' | 'ASSISTANT'

export interface PublicStaffInviteInfo {
  valid: boolean
  reason?: string
  email?: string
  role?: StaffInviteRole
  academy_name?: string
  academy_slug?: string
  expires_at?: string
}

export function staffInviteUrl(token: string): string {
  return `${window.location.origin}/convite-equipe/${token}`
}

export async function fetchPublicStaffInvite(token: string): Promise<PublicStaffInviteInfo> {
  const { data, error } = await supabase.rpc('get_public_staff_invite', { p_token: token })
  if (error) throw error
  return data as PublicStaffInviteInfo
}

export async function createStaffInvite(
  academyId: string,
  email: string,
  role: StaffInviteRole,
) {
  const { data, error } = await supabase.functions.invoke('create-staff-invite', {
    body: { academyId, email, role, inviteBaseUrl: window.location.origin },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as CreateStudentInviteResult
}

export function staffInviteEmailStatusLabel(
  result: CreateStudentInviteResult,
  email: string,
): string {
  return inviteEmailStatusLabel(result, email)
}

export async function completeStaffInvite(input: { token: string; name: string; password: string }) {
  const { data, error } = await supabase.functions.invoke('complete-staff-invite', {
    body: input,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { userId: string; email: string; role: StaffInviteRole }
}
