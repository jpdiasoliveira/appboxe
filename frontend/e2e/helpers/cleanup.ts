import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { E2eEnv } from './env'

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  let page = 1
  const perPage = 200

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const user = data.users.find((row) => row.email?.toLowerCase() === email.toLowerCase())
    if (user) return user.id
    if (data.users.length < perPage) break
    page += 1
  }

  return null
}

async function cleanupStudentRecords(admin: SupabaseClient, studentId: string) {
  const { data: invoices } = await admin.from('academy_invoices').select('id').eq('student_id', studentId)
  const invoiceIds = (invoices ?? []).map((row) => row.id)

  if (invoiceIds.length > 0) {
    await admin.from('academy_payments').delete().in('invoice_id', invoiceIds)
    await admin.from('academy_invoices').delete().in('id', invoiceIds)
  }

  await admin.from('student_payment_methods').delete().eq('student_id', studentId)
  await admin.from('student_categories').delete().eq('student_id', studentId)
  await admin.from('student_subscriptions').delete().eq('student_id', studentId)
  await admin.from('student_term_acceptances').delete().eq('student_id', studentId)
  await admin.from('students').delete().eq('id', studentId)
}

export async function cleanupE2eStudentByEmail(env: E2eEnv, email: string) {
  if (!env.serviceKey) return

  const admin = createClient(env.url, env.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const userId = await findUserIdByEmail(admin, email)
  if (!userId) {
    await admin.from('student_invites').delete().eq('email', email)
    return
  }

  const { data: students } = await admin.from('students').select('id').eq('user_id', userId)
  for (const student of students ?? []) {
    await cleanupStudentRecords(admin, student.id)
  }

  await admin.from('student_invites').delete().eq('email', email)
  await admin.from('user_academy_roles').delete().eq('user_id', userId)
  await admin.from('profiles').delete().eq('user_id', userId)
  await admin.auth.admin.deleteUser(userId)
}
