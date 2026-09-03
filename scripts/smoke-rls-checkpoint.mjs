/**
 * UP-503 — Testes RLS (API remota, sem browser).
 *
 * Valida:
 * - ASSISTANT e PROFESSOR sem acesso financeiro (read + write)
 * - Isolamento multi-tenant (outra academy_id → zero linhas)
 * - Owner vê financeiro; aluno só vê dados próprios
 *
 * Uso:
 *   node scripts/smoke-rls-checkpoint.mjs
 *
 * Requer .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: SUPABASE_SERVICE_ROLE_KEY (testes INSERT negado com invoice real)
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
  FOREIGN_ACADEMY_ID,
  assertInsertDenied,
  assertNoFinanceAccess,
  assertRpcDenied,
  assertTenantIsolationRead,
} from './smoke/rls.mjs'

async function verifyFinanceDenied(r, professorClient, assistantClient, ownerClient, academyId) {
  r.section('ASSISTANT / PROFESSOR — financeiro negado (read)')
  await assertNoFinanceAccess(r, assistantClient, 'assistant', academyId)
  await assertNoFinanceAccess(r, professorClient, 'professor', academyId)

  const { data: ownerCanFin } = await ownerClient.rpc('can_view_academy_finance', {
    p_academy_id: academyId,
  })
  r.assert(ownerCanFin === true, 'owner can_view_academy_finance = true')

  const { count: ownerInvoices } = await ownerClient
    .from('academy_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
  r.ok(`owner lê faturas da própria academia (${ownerInvoices ?? 0})`)
}

async function verifyFinanceWriteDenied(r, assistantClient, professorClient, admin, academyId) {
  if (!admin) {
    r.ok('skip INSERT/RPC financeiro negado (sem SUPABASE_SERVICE_ROLE_KEY)')
    return
  }

  r.section('ASSISTANT / PROFESSOR — financeiro negado (write)')

  const { data: invoice } = await admin
    .from('academy_invoices')
    .select('id, amount')
    .eq('academy_id', academyId)
    .limit(1)
    .maybeSingle()

  if (!invoice?.id) {
    r.ok('skip write tests — nenhuma fatura seed para tentativa de INSERT')
    return
  }

  const paymentRow = {
    invoice_id: invoice.id,
    amount: invoice.amount,
    method: 'PIX',
    status: 'PAGO',
  }

  await assertInsertDenied(r, assistantClient, 'assistant', 'academy_payments', paymentRow)
  await assertInsertDenied(r, professorClient, 'professor', 'academy_payments', paymentRow)

  await assertRpcDenied(r, assistantClient, 'assistant', 'mark_academy_invoice_paid_cash', {
    p_invoice_id: invoice.id,
  })
  await assertRpcDenied(r, professorClient, 'professor', 'mark_academy_invoice_paid_cash', {
    p_invoice_id: invoice.id,
  })
}

async function verifyTenantIsolation(r, ownerClient, professorClient, assistantClient, studentClient) {
  r.section('Isolamento multi-tenant (academy_id estrangeiro)')

  for (const [label, client] of [
    ['owner', ownerClient],
    ['professor', professorClient],
    ['assistant', assistantClient],
  ]) {
    await assertTenantIsolationRead(r, client, label, 'students', 'academy_id', FOREIGN_ACADEMY_ID)
    await assertTenantIsolationRead(r, client, label, 'academy_invoices', 'academy_id', FOREIGN_ACADEMY_ID)
    await assertTenantIsolationRead(r, client, label, 'training_categories', 'academy_id', FOREIGN_ACADEMY_ID)
  }

  const { data: peers, error: peerErr } = await studentClient
    .from('students')
    .select('id, user_id')
    .eq('academy_id', ACADEMY_ID)
  r.assert(!peerErr, 'aluno consulta students da academia')
  r.assert((peers ?? []).length <= 1, 'aluno vê no máximo o próprio registro em students')

  const { data: foreignStudents, error: foreignErr } = await studentClient
    .from('students')
    .select('id')
    .eq('academy_id', FOREIGN_ACADEMY_ID)
  r.assert(!foreignErr, 'aluno consulta students de outra academia')
  r.assert((foreignStudents ?? []).length === 0, 'aluno não vê students de outra academia')
}

async function run() {
  const env = loadEnv()
  const { anon, admin } = createSupabaseClients(env)
  const r = createReporter()

  console.log('RingPro — smoke RLS (UP-503)\n')
  console.log(`Academia seed: ${ACADEMY_ID}`)
  console.log(`Academia estrangeira (fake): ${FOREIGN_ACADEMY_ID}\n`)

  const ownerClient = anon()
  const professorClient = anon()
  const assistantClient = anon()
  const studentClient = anon()

  await signIn(ownerClient, USERS.owner)
  await signIn(professorClient, USERS.professor)
  await signIn(assistantClient, USERS.assistant)
  await signIn(studentClient, USERS.student)

  await verifyFinanceDenied(r, professorClient, assistantClient, ownerClient, ACADEMY_ID)
  await verifyFinanceWriteDenied(r, assistantClient, professorClient, admin, ACADEMY_ID)
  await verifyTenantIsolation(r, ownerClient, professorClient, assistantClient, studentClient)

  const allPassed = r.summary()
  if (!allPassed) process.exit(1)
  console.log('\n✅ Checkpoint RLS (UP-503) passou.\n')
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
