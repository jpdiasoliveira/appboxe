/**
 * Smoke test completo — portal Academia (RLS, KPIs, presença, UP-321/303/304).
 *
 * Uso:
 *   node scripts/smoke-academy-portal.mjs
 *
 * .env na raiz: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: SUPABASE_SERVICE_ROLE_KEY (teste UP-321 com aluno isolado)
 */
import {
  ACADEMY_ID,
  USERS,
  loadEnv,
  createSupabaseClients,
  createReporter,
  signIn,
  countStudents,
  fetchKpis,
  countAttendanceEligible,
} from './smoke/lib.mjs'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoIso(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function verifySharedCategories(r, professorClient, professorUserId) {
  const { data: profCats, error: pcErr } = await professorClient
    .from('instructor_training_categories')
    .select('training_category_id')
    .eq('academy_id', ACADEMY_ID)
    .eq('user_id', professorUserId)
  r.assert(!pcErr, `professor lê suas modalidades (${(profCats ?? []).length})`)
  const profCatIds = new Set((profCats ?? []).map((c) => c.training_category_id))

  const { data: students, error: stErr } = await professorClient
    .from('students')
    .select('id')
    .eq('academy_id', ACADEMY_ID)
  r.assert(!stErr, `lista alunos professor (${(students ?? []).length})`)

  for (const student of students ?? []) {
    const { data: links, error: linkErr } = await professorClient
      .from('student_categories')
      .select('training_category_id')
      .eq('student_id', student.id)
    r.assert(!linkErr, `student_categories aluno ${student.id.slice(0, 8)}`)
    const shared = (links ?? []).some((l) => profCatIds.has(l.training_category_id))
    r.assert(shared, `aluno ${student.id.slice(0, 8)} compartilha modalidade com professor (UP-321)`)
  }
}

async function verifyAttendanceReportData(r, client) {
  const from = daysAgoIso(30)
  const to = todayIso()
  const { data: rows, error } = await client
    .from('attendance_records')
    .select('student_id, training_category_id, class_date, present, category:training_categories(name)')
    .eq('academy_id', ACADEMY_ID)
    .gte('class_date', from)
    .lte('class_date', to)
  r.assert(!error, `relatório presença: ${(rows ?? []).length} registros no período`)

  const byCategory = new Map()
  for (const row of rows ?? []) {
    const key = row.training_category_id
    const cur = byCategory.get(key) ?? { total: 0, present: 0, name: '?' }
    cur.total += 1
    if (row.present) cur.present += 1
    const cat = row.category
    if (cat && typeof cat === 'object' && 'name' in cat) cur.name = cat.name
    if (Array.isArray(cat) && cat[0]?.name) cur.name = cat[0].name
    byCategory.set(key, cur)
  }
  for (const [, stats] of byCategory) {
    const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0
    r.ok(`turma ${stats.name}: ${pct}% (${stats.present}/${stats.total})`)
  }
}

async function verifyUp321WithAdmin(r, admin) {
  r.section('UP-321 — aluno sem modalidade (service role)')
  const orphanEmail = `smoke-orphan-${Date.now()}@academia-teste.dev`

  const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
    email: orphanEmail,
    password: 'RingPro@dev123',
    email_confirm: true,
    user_metadata: { name: 'Smoke Orphan' },
  })
  if (createErr) {
    r.ok(`skip UP-321 isolado: ${createErr.message}`)
    return
  }

  const userId = authUser.user.id
  await admin.from('profiles').upsert({ user_id: userId, name: 'Smoke Orphan' })

  const { data: student, error: stErr } = await admin
    .from('students')
    .insert({
      user_id: userId,
      academy_id: ACADEMY_ID,
      status: 'ATIVO',
      phone: '(11) 00000-0000',
    })
    .select('id')
    .single()
  r.assert(!stErr, 'criou aluno órfão sem modalidade')
  return { studentId: student.id, userId }
}

async function cleanupOrphan(admin, userId, studentId) {
  if (studentId) await admin.from('students').delete().eq('id', studentId)
  if (userId) await admin.auth.admin.deleteUser(userId)
}

async function run() {
  const env = loadEnv()
  const { anon, admin } = createSupabaseClients(env)
  const r = createReporter()

  console.log('RingPro — smoke test portal Academia (API / RLS)\n')
  console.log(`Academia: ${ACADEMY_ID}`)

  const professorClient = anon()
  const ownerClient = anon()
  const assistantClient = anon()
  const studentClient = anon()

  const professorUser = await signIn(professorClient, USERS.professor)
  await signIn(ownerClient, USERS.owner)
  await signIn(assistantClient, USERS.assistant)
  await signIn(studentClient, USERS.student)

  r.section('§9.1 — Escopo de alunos por persona')
  const profTotal = await countStudents(professorClient, ACADEMY_ID)
  const ownerTotal = await countStudents(ownerClient, ACADEMY_ID)
  const assistTotal = await countStudents(assistantClient, ACADEMY_ID)
  r.assert(profTotal > 0, `professor vê ${profTotal} alunos (seed com student_categories)`)
  r.assert(profTotal <= ownerTotal, `professor (${profTotal}) <= owner (${ownerTotal})`)
  r.assert(assistTotal === ownerTotal, `assistant (${assistTotal}) = owner (${ownerTotal}) — vê academia inteira`)

  await verifySharedCategories(r, professorClient, professorUser.id)

  r.section('§9.2 — KPIs (espelho fetchAcademyKpis)')
  const profKpi = await fetchKpis(professorClient, ACADEMY_ID)
  const ownerKpi = await fetchKpis(ownerClient, ACADEMY_ID)
  const assistKpi = await fetchKpis(assistantClient, ACADEMY_ID)
  r.ok(
    `professor KPIs: ativos=${profKpi.alunosAtivos} inadimplentes=${profKpi.inadimplencia} presençasHoje=${profKpi.turmasHoje}`,
  )
  r.ok(
    `owner KPIs: ativos=${ownerKpi.alunosAtivos} inadimplentes=${ownerKpi.inadimplencia} presençasHoje=${ownerKpi.turmasHoje}`,
  )
  r.assert(profKpi.alunosAtivos <= ownerKpi.alunosAtivos, 'KPI ativos professor <= owner')
  r.assert(profKpi.inadimplencia <= ownerKpi.inadimplencia, 'KPI inadimplentes professor <= owner')
  r.assert(assistKpi.alunosAtivos === ownerKpi.alunosAtivos, 'assistant KPI ativos = owner')

  const { data: profCharts, error: chartErr } = await professorClient.rpc(
    'get_academy_dashboard_charts',
    { p_academy_id: ACADEMY_ID },
  )
  r.assert(!chartErr, 'RPC get_academy_dashboard_charts professor')
  r.assert(profCharts != null, 'gráficos retornam payload')
  r.assert(
    Array.isArray(profCharts?.active_by_month) || typeof profCharts === 'object',
    'payload RPC gráficos válido',
  )

  const { data: scoped } = await professorClient.rpc('is_scoped_professor', {
    p_academy_id: ACADEMY_ID,
  })
  const { data: ownerScoped } = await ownerClient.rpc('is_scoped_professor', {
    p_academy_id: ACADEMY_ID,
  })
  r.assert(scoped === true, 'professor is_scoped_professor = true')
  r.assert(ownerScoped === false, 'owner is_scoped_professor = false')

  r.section('§9.1/9.6 — Financeiro e convites bloqueados')
  for (const [label, client] of [
    ['professor', professorClient],
    ['assistant', assistantClient],
  ]) {
    const { data: inv } = await client
      .from('academy_invoices')
      .select('id')
      .eq('academy_id', ACADEMY_ID)
      .limit(3)
    r.assert((inv ?? []).length === 0, `${label} não vê faturas`)

    const { data: invites } = await client
      .from('student_invites')
      .select('id')
      .eq('academy_id', ACADEMY_ID)
      .limit(3)
    r.assert((invites ?? []).length === 0, `${label} não vê convites`)

    const { data: canFin } = await client.rpc('can_view_academy_finance', {
      p_academy_id: ACADEMY_ID,
    })
    r.assert(canFin === false, `${label} can_view_academy_finance = false`)
  }

  const { data: ownerCanFin } = await ownerClient.rpc('can_view_academy_finance', {
    p_academy_id: ACADEMY_ID,
  })
  r.assert(ownerCanFin === true, 'owner can_view_academy_finance = true')

  const { count: ownerInvCount } = await ownerClient
    .from('academy_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', ACADEMY_ID)
  r.ok(`owner consulta faturas (${ownerInvCount ?? 0} no banco)`)

  r.section('§9.1 — Presença (ATIVO + TRIAL na chamada)')
  const profAttendance = await countAttendanceEligible(professorClient, ACADEMY_ID)
  const ownerAttendance = await countAttendanceEligible(ownerClient, ACADEMY_ID)
  r.assert(profAttendance >= profKpi.alunosAtivos, 'chamada inclui TRIAL além de ATIVO')
  r.assert(profAttendance <= ownerAttendance, `elegíveis presença prof (${profAttendance}) <= owner (${ownerAttendance})`)

  r.section('§9.5 — Relatório presença (dados + % por turma)')
  await verifyAttendanceReportData(r, professorClient)
  await verifyAttendanceReportData(r, assistantClient)

  r.section('§9.1 — Categorias, agenda, notificações')
  const { data: categories, error: catErr } = await professorClient
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', ACADEMY_ID)
    .eq('status', 'ATIVO')
  r.assert(!catErr, `categorias professor (${(categories ?? []).length})`)

  const { data: overview, error: ovErr } = await professorClient.rpc(
    'get_academy_category_overview',
    { p_academy_id: ACADEMY_ID },
  )
  r.assert(!ovErr, 'RPC get_academy_category_overview professor')

  const { count: sessions } = await professorClient
    .from('class_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', ACADEMY_ID)
  r.ok(`class_sessions visíveis ao professor (${sessions ?? 0})`)

  const { data: notifications, error: notifErr } = await professorClient
    .from('notifications')
    .select('id, title, read_at')
    .limit(5)
  r.assert(!notifErr, `notificações in-app (${(notifications ?? []).length} recentes)`)

  r.section('§9.3/UP-303 — trial_ends_at e settings academia')
  const { error: trialErr } = await professorClient
    .from('students')
    .select('id, trial_ends_at, status')
    .eq('academy_id', ACADEMY_ID)
    .limit(1)
  r.assert(!trialErr, 'coluna students.trial_ends_at existe')

  const { data: academy, error: acErr } = await ownerClient
    .from('academies')
    .select('settings')
    .eq('id', ACADEMY_ID)
    .single()
  r.assert(!acErr, 'owner lê academies.settings')
  const settings = academy?.settings ?? {}
  r.ok(`settings.trial_mode=${settings.trial_mode ?? 'OFF'} trial_days=${settings.trial_days ?? 7}`)

  r.section('Portal aluno — categories_student_read (onboarding)')
  const { data: studentCats, error: scErr } = await studentClient
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', ACADEMY_ID)
    .eq('status', 'ATIVO')
    .limit(5)
  r.assert(!scErr, `aluno lê modalidades (${(studentCats ?? []).length}) — migration categories_student_read`)
  r.assert((studentCats ?? []).length > 0, 'aluno vê ao menos 1 modalidade ativa')

  if (admin) {
    r.section('§9.3 — UP-321 aluno órfão (service role)')
    let orphan = null
    try {
      orphan = await verifyUp321WithAdmin(r, admin)
      if (orphan?.studentId) {
        const { count: profBefore } = await professorClient
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('id', orphan.studentId)
        r.assert((profBefore ?? 0) === 0, 'professor NÃO vê aluno sem modalidade')

        const primaryCat = (categories ?? [])[0]?.id
        if (primaryCat) {
          await admin.from('student_categories').insert({
            student_id: orphan.studentId,
            training_category_id: primaryCat,
          })
          const profClient2 = anon()
          await signIn(profClient2, USERS.professor)
          const { data: found } = await profClient2
            .from('students')
            .select('id')
            .eq('id', orphan.studentId)
            .maybeSingle()
          r.assert(found?.id === orphan.studentId, 'professor vê aluno após vínculo modalidade')
        }
      }
    } finally {
      if (orphan) await cleanupOrphan(admin, orphan.userId, orphan.studentId)
    }
  } else {
    r.ok('skip UP-321 isolado (sem SUPABASE_SERVICE_ROLE_KEY no .env)')
  }

  const allPassed = r.summary()
  if (!allPassed) process.exit(1)
  console.log('\n✅ Smoke test portal Academia passou.\n')
}

run().catch((err) => {
  console.error(`\n❌ ${err.message}\n`)
  process.exit(1)
})
