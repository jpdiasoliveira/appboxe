/**
 * UP-310 — Checkpoint Fase 3 (API / RLS, sem browser).
 *
 * Valida fluxos críticos:
 * - UP-301: QR check-in (staff gera → aluno confirma presença)
 * - UP-302: graduação básica (faixas + promoção + histórico do aluno)
 *
 * Uso:
 *   node scripts/smoke-phase3-checkpoint.mjs
 *
 * Requer .env na raiz: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: SUPABASE_SERVICE_ROLE_KEY (garante faixas seed se ausentes)
 */
import {
  ACADEMY_ID,
  USERS,
  loadEnv,
  createSupabaseClients,
  createReporter,
  signIn,
} from './smoke/lib.mjs'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const DEFAULT_BELTS = [
  { name: 'Faixa branca', color: '#F9FAFB', sort_order: 1 },
  { name: 'Faixa amarela', color: '#FDE047', sort_order: 2 },
  { name: 'Faixa laranja', color: '#F97316', sort_order: 3 },
  { name: 'Faixa verde', color: '#22C55E', sort_order: 4 },
  { name: 'Faixa azul', color: '#3B82F6', sort_order: 5 },
  { name: 'Faixa roxa', color: '#A855F7', sort_order: 6 },
  { name: 'Faixa marrom', color: '#854D0E', sort_order: 7 },
  { name: 'Faixa preta', color: '#1F2937', sort_order: 8 },
]

async function ensurePhase3Flags(r, client) {
  const required = [
    'module_attendance',
    'module_graduation',
    'module_student_documents',
    'module_class_makeup',
    'module_class_groups',
    'module_physical_assessment',
  ]

  const { data, error } = await client
    .from('academy_feature_flags')
    .select('flag_key, enabled')
    .eq('academy_id', ACADEMY_ID)
    .in('flag_key', required)

  r.assert(!error, 'lê feature flags Fase 3')
  const enabled = new Set((data ?? []).filter((f) => f.enabled).map((f) => f.flag_key))
  for (const key of required) {
    r.assert(enabled.has(key), `flag ${key} ativa na academia seed`)
  }
}

async function getPrimaryCategory(r, client) {
  const { data, error } = await client
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', ACADEMY_ID)
    .eq('status', 'ATIVO')
    .order('name')
    .limit(1)
    .maybeSingle()

  r.assert(!error && data?.id, `modalidade ativa (${data?.name ?? '?'})`)
  return data
}

async function getStudentId(r, client) {
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('students')
    .select('id')
    .eq('academy_id', ACADEMY_ID)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  r.assert(!error && data?.id, 'aluno seed resolvido')
  return data.id
}

async function ensureBeltLevels(r, admin, ownerClient, categoryId) {
  const { data: existing, error: listErr } = await ownerClient
    .from('belt_levels')
    .select('id, name, sort_order')
    .eq('training_category_id', categoryId)
    .order('sort_order')

  r.assert(!listErr, `belt_levels legíveis (${(existing ?? []).length})`)
  if ((existing ?? []).length > 0) {
    return existing[0]
  }

  if (!admin) {
    r.fail('faixas ausentes e sem SUPABASE_SERVICE_ROLE_KEY para seed')
    return null
  }

  const rows = DEFAULT_BELTS.map((belt) => ({
    academy_id: ACADEMY_ID,
    training_category_id: categoryId,
    ...belt,
  }))
  const { error: insErr } = await admin.from('belt_levels').insert(rows)
  r.assert(!insErr, 'seed faixas padrão Boxe (service role)')

  const { data: seeded, error: reErr } = await ownerClient
    .from('belt_levels')
    .select('id, name')
    .eq('training_category_id', categoryId)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  r.assert(!reErr && seeded?.id, `faixa inicial (${seeded?.name})`)
  return seeded
}

async function verifyQrCheckIn(r, professorClient, studentClient, categoryId) {
  r.section('UP-301 — Check-in QR')

  const { data: qrRows, error: qrErr } = await professorClient.rpc('create_attendance_qr_session', {
    p_training_category_id: categoryId,
    p_class_date: todayIso(),
    p_ttl_minutes: 120,
  })

  r.assert(!qrErr, 'professor cria sessão QR')
  const token = qrRows?.[0]?.token
  r.assert(typeof token === 'string' && token.length > 8, `token QR gerado (${String(token).slice(0, 8)}…)`)

  const studentId = await getStudentId(r, studentClient)

  const { data: attendanceId, error: redeemErr } = await studentClient.rpc(
    'redeem_attendance_qr_checkin',
    { p_token: token },
  )

  r.assert(!redeemErr, 'aluno confirma check-in via QR')
  r.assert(typeof attendanceId === 'string', `attendance_records id=${String(attendanceId).slice(0, 8)}…`)

  const { data: record, error: recErr } = await professorClient
    .from('attendance_records')
    .select('id, present, class_date, student_id')
    .eq('id', attendanceId)
    .maybeSingle()

  r.assert(!recErr && record?.present === true, 'presença registrada como presente (staff)')
  r.assert(record?.student_id === studentId, 'presença vinculada ao aluno seed')
  r.ok(`check-in aluno ${studentId.slice(0, 8)} em ${record?.class_date ?? todayIso()}`)
}

async function verifyGraduation(r, ownerClient, professorClient, studentClient, categoryId, admin) {
  r.section('UP-302 — Graduação / faixas')

  const belt = await ensureBeltLevels(r, admin, ownerClient, categoryId)
  if (!belt?.id) return

  const targetStudentId = await getStudentId(r, studentClient)

  const { data: profStudent, error: scopeErr } = await professorClient
    .from('students')
    .select('id')
    .eq('id', targetStudentId)
    .maybeSingle()

  r.assert(!scopeErr && profStudent?.id === targetStudentId, 'professor vê aluno seed no escopo')

  const { data: historyId, error: promoErr } = await professorClient.rpc('promote_student_belt', {
    p_student_id: targetStudentId,
    p_training_category_id: categoryId,
    p_belt_level_id: belt.id,
    p_notes: 'Smoke UP-310',
  })

  r.assert(!promoErr, 'professor registra promoção de faixa')
  r.assert(typeof historyId === 'string', `student_belt_history id=${String(historyId).slice(0, 8)}…`)

  const { data: history, error: histErr } = await studentClient
    .from('student_belt_history')
    .select('id, belt_level_id, promoted_at')
    .eq('student_id', targetStudentId)
    .order('promoted_at', { ascending: false })
    .limit(3)

  r.assert(!histErr && (history ?? []).length > 0, `aluno lê histórico (${(history ?? []).length} registros)`)

  const { data: canManage } = await ownerClient.rpc('can_manage_graduation', {
    p_academy_id: ACADEMY_ID,
    p_training_category_id: categoryId,
  })
  r.assert(canManage === true, 'owner can_manage_graduation = true')
}

async function run() {
  const env = loadEnv()
  const { anon, admin } = createSupabaseClients(env)
  const r = createReporter()

  console.log('RingPro — smoke checkpoint Fase 3 (UP-310)\n')
  console.log(`Academia: ${ACADEMY_ID}`)

  const ownerClient = anon()
  const professorClient = anon()
  const studentClient = anon()

  await signIn(ownerClient, USERS.owner)
  await signIn(professorClient, USERS.professor)
  await signIn(studentClient, USERS.student)

  r.section('Pré-requisitos — flags Fase 3')
  await ensurePhase3Flags(r, ownerClient)

  const category = await getPrimaryCategory(r, ownerClient)
  await verifyQrCheckIn(r, professorClient, studentClient, category.id)
  await verifyGraduation(r, ownerClient, professorClient, studentClient, category.id, admin)

  const allPassed = r.summary()
  if (!allPassed) process.exit(1)
  console.log('\n✅ Checkpoint Fase 3 (UP-310) passou.\n')
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
