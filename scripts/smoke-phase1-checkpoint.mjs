/**
 * UP-112 — Checkpoint Fase 1 (matrícula & experiência, sem browser).
 *
 * Valida fluxo ponta a ponta:
 * lead (landing) → convite → complete-student-invite → plano → modalidade → fatura → pagamento mock
 *
 * Uso:
 *   node scripts/smoke-phase1-checkpoint.mjs
 *
 * Requer .env na raiz: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: SUPABASE_SERVICE_ROLE_KEY (limpeza do aluno smoke ao final)
 */
import {
  ACADEMY_ID,
  USERS,
  PASSWORD,
  loadEnv,
  createSupabaseClients,
  createReporter,
  signIn,
} from './smoke/lib.mjs'
import { invokeSimulatePayment } from './smoke/payments.mjs'
import {
  cleanupEnrollmentSmoke,
  ensureLandingPublished,
  getActiveTermId,
  getFirstCategory,
  getFirstPublicPlan,
  invokeCompleteStudentInvite,
  invokeCreateStudentInvite,
  smokeEnrollmentEmail,
  studentCreateOnboardingInvoice,
  studentSelectPlan,
  studentSetCategories,
  submitLeadForSmoke,
} from './smoke/enrollment.mjs'

async function verifyLeadToInvite(r, { url, anonKey, ownerClient, admin, lead }) {
  const { data: sessionData } = await ownerClient.auth.getSession()
  const accessToken = sessionData.session?.access_token
  r.assert(!!accessToken, 'owner access token')

  const invite = await invokeCreateStudentInvite({
    url,
    anonKey,
    accessToken,
    academyId: ACADEMY_ID,
    email: lead.email,
    leadId: lead.id,
    prefillName: lead.name,
  })
  r.assert(invite.status === 200, `create-student-invite HTTP ${invite.status}`)
  r.assert(typeof invite.data?.token === 'string', 'convite retorna token')

  const { data: leadRow, error: leadErr } = await ownerClient
    .from('leads')
    .select('status')
    .eq('id', lead.id)
    .maybeSingle()
  r.assert(!leadErr && leadRow?.status === 'CONVITE_ENVIADO', 'lead status CONVITE_ENVIADO')

  const termId = admin ? await getActiveTermId(admin, ACADEMY_ID) : null
  const completed = await invokeCompleteStudentInvite({
    url,
    anonKey,
    token: invite.data.token,
    email: lead.email,
    name: lead.name,
    acceptedTermId: termId,
  })
  r.assert(completed.status === 200, `complete-student-invite HTTP ${completed.status}`)
  r.assert(typeof completed.data?.studentId === 'string', 'convite cria studentId')

  if (admin) {
    const { data: converted } = await admin.from('leads').select('status').eq('id', lead.id).maybeSingle()
    r.assert(converted?.status === 'CONVERTIDO', 'lead status CONVERTIDO')
  }

  return {
    studentId: completed.data.studentId,
    userEmail: lead.email,
    inviteToken: invite.data.token,
  }
}

async function verifyStudentOnboarding(r, {
  url,
  anonKey,
  studentClient,
  studentId,
  userEmail,
}) {
  const plan = await getFirstPublicPlan(studentClient, ACADEMY_ID)
  r.assert(!!plan?.id, `plano ativo (${plan?.name ?? '?'})`)

  const category = await getFirstCategory(studentClient, ACADEMY_ID)
  r.assert(!!category?.id, `modalidade ativa (${category?.name ?? '?'})`)

  await studentSelectPlan(studentClient, studentId, plan.id)
  r.ok('assinatura do plano criada')

  await studentSetCategories(studentClient, studentId, [category.id])
  r.ok('modalidade vinculada ao aluno')

  const invoiceId = await studentCreateOnboardingInvoice(studentClient, studentId)
  r.assert(typeof invoiceId === 'string', 'fatura onboarding criada')

  const { data: sessionData } = await studentClient.auth.getSession()
  const accessToken = sessionData.session?.access_token
  const paid = await invokeSimulatePayment({ url, anonKey, accessToken, invoiceId })
  r.assert(paid.status === 200 && paid.data?.ok === true, 'simulate-payment confirma fatura')

  const { data: studentRow, error: stErr } = await studentClient
    .from('students')
    .select('status, onboarding_completed_at')
    .eq('id', studentId)
    .maybeSingle()
  r.assert(!stErr && studentRow?.status === 'ATIVO', 'aluno ATIVO após pagamento')

  const { error: obErr } = await studentClient
    .from('students')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', studentId)
  r.assert(!obErr, 'onboarding_completed_at gravado')

  r.ok(`fluxo completo para ${userEmail}`)
}

async function run() {
  const env = loadEnv()
  const { url, anon, admin } = createSupabaseClients(env)
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const r = createReporter()

  console.log('RingPro — smoke checkpoint Fase 1 (UP-112)\n')
  console.log(`Academia: ${ACADEMY_ID}`)

  const anonClient = anon()
  const ownerClient = anon()
  await signIn(ownerClient, USERS.owner)

  const email = smokeEnrollmentEmail()
  const leadName = 'Smoke Matrícula UP-112'
  let studentId = null
  let userId = null
  let leadId = null

  try {
    r.section('Pré-requisitos — landing publicada')
    const published = await ensureLandingPublished(ownerClient, ACADEMY_ID)
    r.assert(published, 'landing publicada para lead anônimo')

    r.section('Lead → convite')
    const { lead, via } = await submitLeadForSmoke({
      anonClient,
      admin,
      academyId: ACADEMY_ID,
      name: leadName,
      email,
    })
    leadId = lead.id
    r.ok(`lead ${lead.id.slice(0, 8)}… (${lead.status}) via ${via}`)

    const inviteResult = await verifyLeadToInvite(r, {
      url,
      anonKey,
      ownerClient,
      admin,
      lead: { id: lead.id, email, name: leadName },
    })
    studentId = inviteResult.studentId

    r.section('Wizard aluno — plano, modalidade, pagamento')
    const studentClient = anon()
    await studentClient.auth.signInWithPassword({ email, password: PASSWORD })
    const { data: userData } = await studentClient.auth.getUser()
    userId = userData.user?.id ?? null

    await verifyStudentOnboarding(r, {
      url,
      anonKey,
      studentClient,
      studentId,
      userEmail: email,
    })
  } finally {
    if (admin && (studentId || userId || leadId)) {
      r.section('Limpeza')
      await cleanupEnrollmentSmoke(admin, { userId, studentId, leadId })
      r.ok('dados smoke removidos')
    } else if (studentId || leadId) {
      r.ok('limpeza ignorada (sem SUPABASE_SERVICE_ROLE_KEY)')
    }
  }

  const allPassed = r.summary()
  if (!allPassed) process.exit(1)
  console.log('\n✅ Checkpoint Fase 1 (UP-112) passou.\n')
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
