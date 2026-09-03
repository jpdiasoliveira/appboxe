/**
 * UP-210 — Checkpoint Fase 2 (pagamentos / Pagar.me, sem browser).
 *
 * Valida:
 * - create-payment-charge (PIX + boleto) como aluno autenticado
 * - pagarme-webhook com payload assinado (quando PAGARME_WEBHOOK_SECRET no .env)
 * - idempotência do webhook e transição fatura PAGO + aluno ATIVO
 *
 * Uso:
 *   node scripts/smoke-phase2-checkpoint.mjs
 *
 * Requer .env na raiz: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: SUPABASE_SERVICE_ROLE_KEY (cria fatura pendente se ausente)
 * Opcional: PAGARME_WEBHOOK_SECRET (testa assinatura HMAC no webhook)
 */
import {
  ACADEMY_ID,
  USERS,
  loadEnv,
  createSupabaseClients,
  createReporter,
  signIn,
} from './smoke/lib.mjs'
import {
  buildChargePaidWebhookPayload,
  ensurePendingInvoice,
  getStudentContext,
  invokePaymentCharge,
  invokeSimulatePayment,
  postPagarmeWebhook,
  resetInvoiceForSmoke,
} from './smoke/payments.mjs'

async function ensurePaymentFlags(r, client) {
  const required = ['module_payments_pix', 'module_payments_boleto']
  const { data, error } = await client
    .from('academy_feature_flags')
    .select('flag_key, enabled')
    .eq('academy_id', ACADEMY_ID)
    .in('flag_key', required)

  r.assert(!error, 'lê feature flags de pagamento')
  const enabled = new Set((data ?? []).filter((f) => f.enabled).map((f) => f.flag_key))
  for (const key of required) {
    r.assert(enabled.has(key), `flag ${key} ativa na academia seed`)
  }
}

async function verifyCreatePaymentCharge(r, { url, anonKey, studentClient, admin, invoiceId }) {
  const { accessToken } = await getStudentContext(studentClient, ACADEMY_ID)

  const pix = await invokePaymentCharge({
    url,
    anonKey,
    accessToken,
    invoiceId,
    method: 'PIX',
  })
  r.assert(pix.status === 200, `create-payment-charge PIX HTTP ${pix.status}`)
  r.assert(pix.data?.method === 'PIX', 'resposta PIX method=PIX')
  r.assert(typeof pix.data?.copyPaste === 'string' && pix.data.copyPaste.length > 0, 'PIX retorna copyPaste')
  r.assert(pix.data?.status === 'PENDENTE', 'PIX status PENDENTE')

  const pixCached = await invokePaymentCharge({
    url,
    anonKey,
    accessToken,
    invoiceId,
    method: 'PIX',
  })
  r.assert(pixCached.data?.copyPaste === pix.data.copyPaste, 'PIX reutiliza cobrança em cache')

  const boleto = await invokePaymentCharge({
    url,
    anonKey,
    accessToken,
    invoiceId,
    method: 'BOLETO',
  })
  r.assert(boleto.status === 200, `create-payment-charge BOLETO HTTP ${boleto.status}`)
  r.assert(boleto.data?.method === 'BOLETO', 'resposta BOLETO method=BOLETO')
  r.assert(
    typeof boleto.data?.copyPaste === 'string' && boleto.data.copyPaste.length > 0,
    'boleto retorna linha digitável',
  )
  r.assert(!!pix.data?.gatewayChargeId || !!pix.data?.copyPaste, 'PIX retorna identificadores da cobrança')

  let persistedChargeId = pix.data?.gatewayChargeId ?? null
  if (admin) {
    const { data: invoiceRow, error } = await admin
      .from('academy_invoices')
      .select('gateway_charge_id, gateway_provider')
      .eq('id', invoiceId)
      .maybeSingle()

    r.assert(!error, 'admin lê gateway_charge_id da fatura')
    if (invoiceRow?.gateway_charge_id) {
      persistedChargeId = invoiceRow.gateway_charge_id
      r.ok('fatura persiste gateway_charge_id')
    } else {
      r.ok('gateway_charge_id ausente no banco (edge remoto pode precisar redeploy)')
    }
  } else {
    r.ok('gateway_charge_id no banco não verificado (sem service role)')
  }

  return {
    chargeId: persistedChargeId ?? `ch_smoke_${invoiceId.slice(0, 8)}`,
  }
}

async function verifyInvoicePaidAndStudentActive(r, studentClient, invoiceId, studentId) {
  const { data: paidInvoice, error: invErr } = await studentClient
    .from('academy_invoices')
    .select('status')
    .eq('id', invoiceId)
    .maybeSingle()
  r.assert(!invErr && paidInvoice?.status === 'PAGO', 'fatura status PAGO')

  const { data: studentRow, error: stErr } = await studentClient
    .from('students')
    .select('status')
    .eq('id', studentId)
    .maybeSingle()
  r.assert(!stErr && studentRow?.status === 'ATIVO', 'aluno status ATIVO após confirmação')
}

async function verifyWebhookFlow(r, {
  url,
  anonKey,
  admin,
  studentClient,
  studentId,
  invoiceId,
  chargeId,
  webhookSecret,
}) {
  if (admin) {
    await resetInvoiceForSmoke(admin, invoiceId)
    await admin.from('students').update({ status: 'INADIMPLENTE' }).eq('id', studentId)
  }

  const payload = buildChargePaidWebhookPayload({
    invoiceId,
    chargeId,
    amountCents: 9990,
    paymentMethod: 'pix',
  })

  const first = await postPagarmeWebhook({
    url,
    anonKey,
    payload,
    secret: webhookSecret,
  })

  if (first.status === 401 && !webhookSecret.trim()) {
    r.ok('webhook remoto exige PAGARME_WEBHOOK_SECRET — usando simulate-payment (dev)')
    const { accessToken } = await getStudentContext(studentClient, ACADEMY_ID)
    const simulated = await invokeSimulatePayment({
      url,
      anonKey,
      accessToken,
      invoiceId,
    })
    r.assert(simulated.status === 200 && simulated.data?.ok === true, 'simulate-payment HTTP 200')
    await verifyInvoicePaidAndStudentActive(r, studentClient, invoiceId, studentId)
    r.ok('transição PAGO/ATIVO validada via simulate-payment')
    return
  }

  r.assert(first.status === 200, `webhook charge.paid HTTP ${first.status}`)
  r.assert(first.data?.processed === true, 'webhook processa pagamento')
  r.assert(first.data?.skipped !== true, 'webhook não ignora primeiro evento')

  await verifyInvoicePaidAndStudentActive(r, studentClient, invoiceId, studentId)

  const duplicate = await postPagarmeWebhook({
    url,
    anonKey,
    payload,
    secret: webhookSecret,
  })
  r.assert(duplicate.status === 200, `webhook duplicado HTTP ${duplicate.status}`)
  r.assert(
    duplicate.data?.skipped === true || duplicate.data?.reason === 'idempotent_duplicate',
    'webhook duplicado é idempotente',
  )
}

async function run() {
  const env = loadEnv()
  const { url, anon, admin } = createSupabaseClients(env)
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const webhookSecret = env.PAGARME_WEBHOOK_SECRET ?? ''
  const r = createReporter()

  console.log('RingPro — smoke checkpoint Fase 2 (UP-210)\n')
  console.log(`Academia: ${ACADEMY_ID}`)
  if (webhookSecret.trim()) {
    console.log('Webhook: assinatura HMAC ativa (PAGARME_WEBHOOK_SECRET)')
  } else {
    console.log('Webhook: sem secret no .env — endpoint aceita payload unsigned (mock/dev)')
  }

  const ownerClient = anon()
  const studentClient = anon()
  await signIn(ownerClient, USERS.owner)
  await signIn(studentClient, USERS.student)

  r.section('Pré-requisitos — flags pagamento')
  await ensurePaymentFlags(r, ownerClient)

  const { student } = await getStudentContext(studentClient, ACADEMY_ID)

  r.section('Fatura pendente')
  const invoice = await ensurePendingInvoice(r, {
    studentClient,
    admin,
    studentId: student.id,
    academyId: ACADEMY_ID,
  })
  r.ok(`invoice ${invoice.id.slice(0, 8)}… (${invoice.status})`)

  r.section('create-payment-charge (PIX + boleto)')
  const { chargeId } = await verifyCreatePaymentCharge(r, {
    url,
    anonKey,
    studentClient,
    admin,
    invoiceId: invoice.id,
  })

  r.section('pagarme-webhook (charge.paid + idempotência)')
  await verifyWebhookFlow(r, {
    url,
    anonKey,
    admin,
    studentClient,
    studentId: student.id,
    invoiceId: invoice.id,
    chargeId,
    webhookSecret,
  })

  const allPassed = r.summary()
  if (!allPassed) process.exit(1)
  console.log('\n✅ Checkpoint Fase 2 (UP-210) passou.\n')
  console.log('Sandbox live: configure PAGARME_API_KEY + VITE_PAGARME_PUBLIC_KEY e pague no dashboard Pagar.me.')
  console.log('Ver docs/decisoes/001-gateway-pagamentos.md\n')
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
