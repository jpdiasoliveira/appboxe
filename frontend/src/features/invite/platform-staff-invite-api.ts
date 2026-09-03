import { supabase } from '../../lib/supabase'

export type PlatformStaffInviteRole = 'PLATFORM_SUPPORT' | 'PLATFORM_FINANCE'

export interface PublicPlatformStaffInviteInfo {
  valid: boolean
  reason?: string
  email?: string
  role?: PlatformStaffInviteRole
  expires_at?: string
}

export function platformStaffInviteUrl(token: string): string {
  return `${window.location.origin}/convite-plataforma/${token}`
}

export async function fetchPublicPlatformStaffInvite(
  token: string,
): Promise<PublicPlatformStaffInviteInfo> {
  const { data, error } = await supabase.rpc('get_public_platform_staff_invite', { p_token: token })
  if (error) throw error
  return data as PublicPlatformStaffInviteInfo
}

export async function completePlatformStaffInvite(input: {
  token: string
  name: string
  password: string
}) {
  const { data, error } = await supabase.functions.invoke('complete-platform-staff-invite', {
    body: input,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { userId: string; email: string; role: PlatformStaffInviteRole }
}
