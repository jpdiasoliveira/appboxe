import { createHmac, randomUUID } from 'crypto'

export function signPagarmeWebhookSignature(rawBody, secret) {
  if (!secret?.trim()) return null
  const hex = createHmac('sha256', secret.trim()).update(rawBody).digest('hex')
  return `sha256=${hex}`
}

export function buildChargePaidWebhookPayload({
  invoiceId,
  chargeId = `ch_smoke_${randomUUID().slice(0, 8)}`,
  eventId = `hook_smoke_${randomUUID().slice(0, 8)}`,
  amountCents = 9990,
  paymentMethod = 'pix',
} = {}) {
  return {
    id: eventId,
    type: 'charge.paid',
    data: {
      id: chargeId,
      status: 'paid',
      payment_method: paymentMethod,
      amount: amountCents,
      metadata: { invoice_id: invoiceId },
    },
  }
}

export async function postPagarmeWebhook({ url, anonKey, payload, secret }) {
  const rawBody = JSON.stringify(payload)
  const headers = {
    apikey: anonKey,
    'Content-Type': 'application/json',
  }
  const signature = signPagarmeWebhookSignature(rawBody, secret)
  if (signature) headers['x-pagarme-signature'] = signature

  const res = await fetch(`${url}/functions/v1/pagarme-webhook`, {
    method: 'POST',
    headers,
    body: rawBody,
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

export async function invokePaymentCharge({ url, anonKey, accessToken, invoiceId, method }) {
  const res = await fetch(`${url}/functions/v1/create-payment-charge`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoiceId, method }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

export async function getStudentContext(client, academyId) {
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError || !userData.user) throw new Error(`auth user: ${userError?.message ?? 'ausente'}`)

  const { data: student, error: studentError } = await client
    .from('students')
    .select('id, status, academy_id')
    .eq('user_id', userData.user.id)
    .eq('academy_id', academyId)
    .maybeSingle()

  if (studentError || !student?.id) {
    throw new Error(`student row: ${studentError?.message ?? 'não encontrado'}`)
  }

  const { data: sessionData } = await client.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('access token ausente após login')

  return { student, accessToken }
}

export async function ensurePendingInvoice(r, { studentClient, admin, studentId, academyId }) {
  const { data: pending, error } = await studentClient
    .from('academy_invoices')
    .select('id, status, amount, gateway_charge_id')
    .eq('student_id', studentId)
    .in('status', ['PENDENTE', 'ATRASADO'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  r.assert(!error, 'aluno lê fatura pendente')
  if (pending?.id) return pending

  if (!admin) {
    r.fail('Sem fatura pendente — defina SUPABASE_SERVICE_ROLE_KEY para criar uma no smoke')
  }

  const due = new Date()
  due.setDate(due.getDate() + 7)
  const { data: created, error: insertError } = await admin
    .from('academy_invoices')
    .insert({
      academy_id: academyId,
      student_id: studentId,
      amount: 99.9,
      due_date: due.toISOString().slice(0, 10),
      status: 'PENDENTE',
    })
    .select('id, status, amount, gateway_charge_id')
    .single()

  r.assert(!insertError && created?.id, 'admin cria fatura PENDENTE para smoke')
  return created
}

export async function invokeSimulatePayment({ url, anonKey, accessToken, invoiceId }) {
  const res = await fetch(`${url}/functions/v1/simulate-payment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invoiceId }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: res.status, data }
}

export async function resetInvoiceForSmoke(admin, invoiceId) {
  if (!admin) return
  await admin.from('academy_payments').delete().eq('invoice_id', invoiceId)
  await admin
    .from('academy_invoices')
    .update({
      status: 'PENDENTE',
      gateway_provider: null,
      gateway_charge_id: null,
      gateway_metadata: null,
    })
    .eq('id', invoiceId)
}
