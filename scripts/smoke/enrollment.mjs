import { randomUUID } from 'crypto'

export function smokeEnrollmentEmail() {
  return `smoke-enroll-${Date.now()}-${randomUUID().slice(0, 6)}@academia-teste.dev`
}

export async function ensureLandingPublished(client, academyId) {
  const { data } = await client
    .from('landing_page_config')
    .select('published')
    .eq('academy_id', academyId)
    .maybeSingle()

  if (data?.published) return true

  const { error } = await client.from('landing_page_config').upsert(
    {
      academy_id: academyId,
      sections: { hero: { title: 'Academia Teste' } },
      published: true,
    },
    { onConflict: 'academy_id' },
  )
  return !error
}

export async function submitLeadAnon(anonClient, { academyId, name, email }) {
  const { data, error } = await anonClient
    .from('leads')
    .insert({
      academy_id: academyId,
      name,
      email,
      phone: '(11) 90000-0000',
      message: 'Smoke UP-112',
      status: 'NOVO',
    })
    .select('id, status')
    .single()

  if (error) throw new Error(`lead insert: ${error.message}`)
  return data
}

export async function submitLeadForSmoke({ anonClient, admin, academyId, name, email }) {
  try {
    return { lead: await submitLeadAnon(anonClient, { academyId, name, email }), via: 'anon' }
  } catch {
    if (!admin) throw new Error('lead anon bloqueado e sem SUPABASE_SERVICE_ROLE_KEY')
    const { data, error } = await admin
      .from('leads')
      .insert({
        academy_id: academyId,
        name,
        email,
        phone: '(11) 90000-0000',
        message: 'Smoke UP-112 (admin fallback)',
        status: 'NOVO',
      })
      .select('id, status')
      .single()
    if (error) throw new Error(`lead admin insert: ${error.message}`)
    return { lead: data, via: 'admin' }
  }
}

export async function invokeCreateStudentInvite({
  url,
  anonKey,
  accessToken,
  academyId,
  email,
  leadId,
  prefillName,
}) {
  const res = await fetch(`${url}/functions/v1/create-student-invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      academyId,
      email,
      leadId,
      prefillName,
      inviteBaseUrl: 'http://localhost:5173',
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

export async function invokeCompleteStudentInvite({
  url,
  anonKey,
  token,
  email,
  name,
  acceptedTermId,
}) {
  const res = await fetch(`${url}/functions/v1/complete-student-invite`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      email,
      name,
      password: 'RingPro@dev123',
      phone: '(11) 91111-2222',
      acceptedTermId: acceptedTermId ?? undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

export async function getActiveTermId(admin, academyId) {
  const { data } = await admin
    .from('academy_terms')
    .select('id')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .maybeSingle()
  return data?.id ?? null
}

export async function getFirstPublicPlan(client, academyId) {
  const { data, error } = await client
    .from('academy_plans')
    .select('id, name, price')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('price')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`plans: ${error.message}`)
  return data
}

export async function getFirstCategory(client, academyId) {
  const { data, error } = await client
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('name')
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`categories: ${error.message}`)
  return data
}

export async function studentSelectPlan(client, studentId, planId) {
  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)
  const { error } = await client.from('student_subscriptions').insert({
    student_id: studentId,
    academy_plan_id: planId,
    next_billing_date: nextBilling.toISOString().slice(0, 10),
    status: 'ATIVO',
  })
  if (error) throw new Error(`select plan: ${error.message}`)
}

export async function studentSetCategories(client, studentId, categoryIds) {
  await client.from('student_categories').delete().eq('student_id', studentId)
  if (categoryIds.length === 0) return
  const rows = categoryIds.map((training_category_id) => ({
    student_id: studentId,
    training_category_id,
  }))
  const { error } = await client.from('student_categories').insert(rows)
  if (error) throw new Error(`categories: ${error.message}`)
}

export async function studentCreateOnboardingInvoice(client, studentId) {
  const { data, error } = await client.rpc('create_student_onboarding_invoice', {
    p_student_id: studentId,
  })
  if (error) throw new Error(`onboarding invoice: ${error.message}`)
  return data
}

export async function cleanupEnrollmentSmoke(admin, { userId, studentId, leadId }) {
  if (!admin) return

  if (studentId) {
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

  if (userId) {
    await admin.from('user_academy_roles').delete().eq('user_id', userId)
    await admin.from('profiles').delete().eq('user_id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  if (leadId) {
    await admin.from('student_invites').delete().eq('lead_id', leadId)
    await admin.from('leads').delete().eq('id', leadId)
  }
}
