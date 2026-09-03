/**
 * Seed usuários de desenvolvimento no Supabase.
 * Uso: node scripts/seed-dev-users.mjs (na raiz do repo, com .env)
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const require = createRequire(resolve(root, 'frontend/package.json'))
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const path = resolve(root, '.env')
  try {
    const raw = readFileSync(path, 'utf8')
    const env = {}
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const m = trimmed.match(/^([^#=]+)=(.*)$/)
      if (m) env[m[1].trim()] = m[2].trim()
    }
    return env
  } catch (err) {
    console.error(`Não foi possível ler ${path}:`, err.message)
    return {}
  }
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Defina VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env da raiz')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ACADEMY_ID = 'a0000000-0000-4000-8000-000000000001'
const PASSWORD = 'RingPro@dev123'

const users = [
  { email: 'platform@ringpro.dev', name: 'Dono SaaS', role: 'PLATFORM_OWNER', academyId: null },
  { email: 'owner@academia-teste.dev', name: 'Dono Academia', role: 'SCHOOL_OWNER', academyId: ACADEMY_ID },
  { email: 'professor@academia-teste.dev', name: 'Professor', role: 'PROFESSOR', academyId: ACADEMY_ID },
  { email: 'assistant@academia-teste.dev', name: 'Sub Professor', role: 'ASSISTANT', academyId: ACADEMY_ID },
  { email: 'aluno@academia-teste.dev', name: 'Aluno Teste', role: 'STUDENT', academyId: ACADEMY_ID },
]

async function ensureUser({ email, name, role, academyId }) {
  const { data: list } = await supabase.auth.admin.listUsers()
  let user = list?.users?.find((u) => u.email === email)

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    user = data.user
    console.log('Criado:', email)
  } else {
    console.log('Existe:', email)
  }

  await supabase.from('profiles').upsert({
    user_id: user.id,
    name,
    must_change_password: false,
  }, { onConflict: 'user_id' })

  const { error: roleError } = await supabase.from('user_academy_roles').upsert(
    {
      user_id: user.id,
      academy_id: academyId,
      role,
      status: 'ATIVO',
    },
    { onConflict: 'user_id,academy_id,role', ignoreDuplicates: false },
  )

  if (roleError) {
    const { data: existing } = await supabase
      .from('user_academy_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', role)
      .maybeSingle()
    if (!existing) {
      await supabase.from('user_academy_roles').insert({
        user_id: user.id,
        academy_id: academyId,
        role,
        status: 'ATIVO',
      })
    }
  }
}

const DEFAULT_FLAGS = [
  'module_payments_card',
  'module_payments_pix',
  'module_payments_boleto',
  'module_attendance',
  'module_landing',
  'module_notifications_email',
  'module_notifications_push',
  'module_class_schedule',
  'module_graduation',
  'module_student_documents',
  'module_class_makeup',
  'module_class_groups',
  'module_physical_assessment',
]

async function seedFlags(academyId) {
  for (const key of DEFAULT_FLAGS) {
    await supabase.from('academy_feature_flags').upsert(
      { academy_id: academyId, flag_key: key, enabled: true },
      { onConflict: 'academy_id,flag_key' },
    )
  }
}

async function seedAcademyTerm(academyId) {
  const { data: existing } = await supabase
    .from('academy_terms')
    .select('id')
    .eq('academy_id', academyId)
    .eq('is_active', true)
    .maybeSingle()

  if (existing) return

  await supabase.from('academy_terms').insert({
    academy_id: academyId,
    version: 1,
    title: 'Termo de matrícula e uso',
    content_html:
      '<p>Ao concluir o cadastro, você declara estar ciente das regras da academia, política de cancelamento, uso de imagem em treinos e responsabilidade pelas informações fornecidas.</p><p>O não cumprimento das normas internas pode resultar em suspensão da matrícula conforme regulamento local.</p>',
    is_active: true,
  })
}

function isoDateMonthsAgo(months, day = 10) {
  const d = new Date()
  d.setDate(day)
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function isoMonthStartMonthsAgo(months) {
  const d = new Date()
  d.setDate(1)
  d.setHours(12, 0, 0, 0)
  d.setMonth(d.getMonth() - months)
  return d.toISOString()
}

/** Alunos fictícios para gráficos do dashboard (sem login na UI). */
const DEMO_STUDENTS = [
  { key: '01', name: 'Ana Silva', monthsAgo: 5, status: 'ATIVO', birthMonth: 9, birthDay: 2 },
  { key: '02', name: 'Bruno Costa', monthsAgo: 5, status: 'ATIVO', birthMonth: 3, birthDay: 12 },
  { key: '03', name: 'Carla Mendes', monthsAgo: 4, status: 'ATIVO', birthMonth: 9, birthDay: 15 },
  { key: '04', name: 'Diego Lima', monthsAgo: 4, status: 'ATIVO', birthMonth: 7, birthDay: 22 },
  { key: '05', name: 'Elena Souza', monthsAgo: 4, status: 'TRIAL', birthMonth: 11, birthDay: 8 },
  { key: '06', name: 'Felipe Rocha', monthsAgo: 3, status: 'ATIVO', birthMonth: 1, birthDay: 30 },
  { key: '07', name: 'Gabriela Nunes', monthsAgo: 3, status: 'ATIVO', birthMonth: 5, birthDay: 18 },
  { key: '08', name: 'Henrique Dias', monthsAgo: 3, status: 'INADIMPLENTE', birthMonth: 9, birthDay: 2 },
  { key: '09', name: 'Isabela Prado', monthsAgo: 2, status: 'ATIVO', birthMonth: 12, birthDay: 5 },
  { key: '10', name: 'João Martins', monthsAgo: 2, status: 'ATIVO', birthMonth: 8, birthDay: 14 },
  { key: '11', name: 'Karina Alves', monthsAgo: 1, status: 'ATIVO', birthMonth: 4, birthDay: 27 },
  { key: '12', name: 'Lucas Pereira', monthsAgo: 1, status: 'INADIMPLENTE', birthMonth: 6, birthDay: 3 },
  { key: '13', name: 'Marcos Teixeira', monthsAgo: 0, status: 'ATIVO', birthMonth: 10, birthDay: 21 },
]

async function ensureDemoAuthUser(email, name, usersByEmail) {
  let user = usersByEmail.get(email)

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    })
    if (error) throw new Error(`${email}: ${error.message}`)
    user = data.user
    usersByEmail.set(email, user)
    console.log('Demo aluno:', email)
  }

  await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      name,
      must_change_password: false,
    },
    { onConflict: 'user_id' },
  )

  return user.id
}

async function seedDashboardDemoData(academyId) {
  const { data: listData } = await supabase.auth.admin.listUsers()
  const usersByEmail = new Map((listData?.users ?? []).map((u) => [u.email, u]))
  const studentIds = []
  let createdUsers = 0
  let updatedStudents = 0

  for (const demo of DEMO_STUDENTS) {
    const email = `demo-${demo.key}@academia-teste.dev`
    const hadUser = usersByEmail.has(email)
    const userId = await ensureDemoAuthUser(email, demo.name, usersByEmail)
    if (!hadUser) createdUsers += 1

    const birthDate =
      demo.birthMonth && demo.birthDay
        ? `1995-${String(demo.birthMonth).padStart(2, '0')}-${String(demo.birthDay).padStart(2, '0')}`
        : undefined

    const { data: row, error } = await supabase
      .from('students')
      .upsert(
        {
          user_id: userId,
          academy_id: academyId,
          phone: `(11) 9900-${demo.key}00`,
          status: demo.status,
          enrollment_date: isoDateMonthsAgo(demo.monthsAgo),
          onboarding_completed_at: new Date().toISOString(),
          ...(birthDate ? { birth_date: birthDate } : {}),
        },
        { onConflict: 'user_id,academy_id' },
      )
      .select('id')
      .single()

    if (error) {
      console.warn(`Aviso demo ${email}:`, error.message)
      continue
    }
    if (row?.id) {
      studentIds.push(row.id)
      updatedStudents += 1
    }
  }

  const anchorStudentId = studentIds[0]
  if (!anchorStudentId) {
    console.warn('Dashboard demo: nenhum aluno demo gravado — verifique migrations.')
    return
  }

  let invoicesCreated = 0
  const revenues = [980, 1240, 1490, 1680, 1920, 2150]
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo -= 1) {
    const createdAt = isoMonthStartMonthsAgo(monthsAgo)
    const monthStart = new Date(createdAt)
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const { count } = await supabase
      .from('academy_invoices')
      .select('*', { count: 'exact', head: true })
      .eq('academy_id', academyId)
      .eq('status', 'PAGO')
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', monthEnd.toISOString())

    if ((count ?? 0) > 0) continue

    const { error: invError } = await supabase.from('academy_invoices').insert({
      academy_id: academyId,
      student_id: anchorStudentId,
      amount: revenues[5 - monthsAgo],
      due_date: isoDateMonthsAgo(monthsAgo, 5),
      status: 'PAGO',
      created_at: createdAt,
    })
    if (!invError) invoicesCreated += 1
  }

  const { count: paidTotal } = await supabase
    .from('academy_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('status', 'PAGO')

  console.log(
    `\nDashboard demo: ${updatedStudents} alunos demo (${createdUsers} usuários novos), ${paidTotal ?? 0} faturas pagas no total (+${invoicesCreated} nesta execução)`,
  )
}

async function seedGraduationLevels(academyId) {
  const { data: category } = await supabase
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('name')
    .limit(1)
    .maybeSingle()

  if (!category?.id) return

  const { count } = await supabase
    .from('belt_levels')
    .select('*', { count: 'exact', head: true })
    .eq('training_category_id', category.id)

  if ((count ?? 0) > 0) {
    console.log(`Faixas graduação já existem (${category.name})`)
    return
  }

  const defaults = [
    { name: 'Faixa branca', color: '#F9FAFB', sort_order: 1 },
    { name: 'Faixa amarela', color: '#FDE047', sort_order: 2 },
    { name: 'Faixa laranja', color: '#F97316', sort_order: 3 },
    { name: 'Faixa verde', color: '#22C55E', sort_order: 4 },
    { name: 'Faixa azul', color: '#3B82F6', sort_order: 5 },
    { name: 'Faixa roxa', color: '#A855F7', sort_order: 6 },
    { name: 'Faixa marrom', color: '#854D0E', sort_order: 7 },
    { name: 'Faixa preta', color: '#1F2937', sort_order: 8 },
  ]

  const { error } = await supabase.from('belt_levels').insert(
    defaults.map((belt) => ({
      academy_id: academyId,
      training_category_id: category.id,
      ...belt,
    })),
  )

  if (error) {
    console.warn('Aviso faixas graduação:', error.message)
    return
  }

  console.log(`Faixas padrão criadas para ${category.name} (UP-302 seed)`)
}

async function seedClassGroups(academyId) {
  const { data: boxe } = await supabase
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .ilike('name', 'Boxe')
    .order('name')
    .limit(1)
    .maybeSingle()

  if (!boxe?.id) {
    console.warn('Seed turmas: modalidade Boxe não encontrada')
    return
  }

  const { data: userList } = await supabase.auth.admin.listUsers()
  const professor = userList?.users?.find((u) => u.email === 'professor@academia-teste.dev')
  const alunoAuth = userList?.users?.find((u) => u.email === 'aluno@academia-teste.dev')

  const groupDefs = [
    {
      name: 'Boxe Manhã',
      schedule_hint: { days: ['MON', 'WED', 'FRI'], time: '07:00' },
    },
    {
      name: 'Boxe Noite',
      schedule_hint: { days: ['MON', 'WED', 'FRI'], time: '19:00' },
    },
  ]

  const groupIds = {}

  for (const def of groupDefs) {
    const { data: existing } = await supabase
      .from('class_groups')
      .select('id')
      .eq('academy_id', academyId)
      .eq('name', def.name)
      .maybeSingle()

    if (existing?.id) {
      await supabase
        .from('class_groups')
        .update({
          schedule_hint: def.schedule_hint,
          instructor_user_id: professor?.id ?? null,
          status: 'ATIVO',
        })
        .eq('id', existing.id)
      groupIds[def.name] = existing.id
      continue
    }

    const { data: created, error } = await supabase
      .from('class_groups')
      .insert({
        academy_id: academyId,
        training_category_id: boxe.id,
        name: def.name,
        description: 'Turma operacional seed (UP-313)',
        max_students: 20,
        schedule_hint: def.schedule_hint,
        instructor_user_id: professor?.id ?? null,
        status: 'ATIVO',
      })
      .select('id')
      .single()

    if (error) {
      console.warn(`Turma ${def.name}:`, error.message)
      continue
    }
    groupIds[def.name] = created.id
  }

  const morningId = groupIds['Boxe Manhã']
  const nightId = groupIds['Boxe Noite']
  if (!morningId || !nightId) return

  const { count: existingMembers } = await supabase
    .from('class_group_members')
    .select('*', { count: 'exact', head: true })
    .in('class_group_id', [morningId, nightId])

  if ((existingMembers ?? 0) > 0) {
    console.log(`Turmas seed já populadas (${existingMembers} vínculos em Manhã/Noite)`)
    return
  }

  const { data: boxeStudents } = await supabase
    .from('student_categories')
    .select('student_id')
    .eq('training_category_id', boxe.id)

  const studentIds = [...new Set((boxeStudents ?? []).map((r) => r.student_id))].sort()
  if (studentIds.length < 2) {
    console.warn('Seed turmas: poucos alunos na modalidade Boxe')
    return
  }

  let alunoStudentId = null
  if (alunoAuth) {
    const { data: st } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', alunoAuth.id)
      .eq('academy_id', academyId)
      .maybeSingle()
    alunoStudentId = st?.id ?? null
  }

  const pool = studentIds.filter((id) => id !== alunoStudentId)
  const morningStudents = alunoStudentId ? [alunoStudentId] : []
  const nightStudents = []

  pool.forEach((id, index) => {
    if (index % 2 === 0) morningStudents.push(id)
    else nightStudents.push(id)
  })

  for (const studentId of morningStudents) {
    await supabase.from('class_group_members').upsert(
      { class_group_id: morningId, student_id: studentId },
      { onConflict: 'class_group_id,student_id' },
    )
  }
  for (const studentId of nightStudents) {
    await supabase.from('class_group_members').upsert(
      { class_group_id: nightId, student_id: studentId },
      { onConflict: 'class_group_id,student_id' },
    )
  }

  console.log(
    `Turmas seed UP-313: ${boxe.name} — Manhã ${morningStudents.length} alunos, Noite ${nightStudents.length} alunos`,
  )
}

async function linkProfessorToCategories(academyId) {
  const { data: list } = await supabase.auth.admin.listUsers()
  const professor = list?.users?.find((u) => u.email === 'professor@academia-teste.dev')
  if (!professor) return

  const { data: categories } = await supabase
    .from('training_categories')
    .select('id')
    .eq('academy_id', academyId)

  if (!categories?.length) return

  for (const cat of categories) {
    const { error } = await supabase.from('instructor_training_categories').upsert(
      {
        academy_id: academyId,
        user_id: professor.id,
        training_category_id: cat.id,
      },
      { onConflict: 'user_id,training_category_id' },
    )
    if (error) console.warn('Vínculo professor/modalidade:', error.message)
  }

  console.log(`Professor demo vinculado a ${categories.length} modalidade(s)`)
}

/** UP-321: alunos precisam de student_categories para aparecer no escopo do professor. */
async function linkDemoStudentsToCategories(academyId) {
  const { data: categories } = await supabase
    .from('training_categories')
    .select('id, name')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('name')

  if (!categories?.length) return

  const { data: students } = await supabase
    .from('students')
    .select('id')
    .eq('academy_id', academyId)

  if (!students?.length) return

  const primaryId = categories[0].id
  const secondaryId = categories[1]?.id ?? primaryId
  let links = 0

  for (let i = 0; i < students.length; i++) {
    const studentId = students[i].id
    const categoryIds = i % 3 === 2 && secondaryId !== primaryId ? [primaryId, secondaryId] : [primaryId]

    await supabase.from('student_categories').delete().eq('student_id', studentId)

    for (const training_category_id of categoryIds) {
      const { error } = await supabase.from('student_categories').upsert(
        { student_id: studentId, training_category_id },
        { onConflict: 'student_id,training_category_id' },
      )
      if (!error) links += 1
    }
  }

  console.log(
    `Alunos demo vinculados a modalidades (${links} vínculos, turma principal: ${categories[0].name})`,
  )
}

async function main() {
  const SAAS_BASICO = 'b0000000-0000-4000-8000-000000000001'

  await supabase.from('academies').upsert(
    {
      id: ACADEMY_ID,
      name: 'Academia Teste',
      slug: 'academia-teste',
      status: 'ATIVO',
      saas_plan_id: SAAS_BASICO,
    },
    { onConflict: 'slug' },
  )

  await seedFlags(ACADEMY_ID)
  await seedAcademyTerm(ACADEMY_ID)

  await supabase.from('landing_page_config').upsert(
    {
      academy_id: ACADEMY_ID,
      published: true,
      sections: {
        hero: {
          title: 'Academia Teste — Artes Marciais',
          subtitle: 'Boxe, Muay Thai e muito mais. Agende sua aula experimental.',
          ctaText: 'Quero me matricular',
        },
        about: {
          title: 'Sobre a Academia Teste',
          body: 'Há mais de 10 anos formando campeões e transformando vidas através das artes marciais.',
        },
        contact: {
          title: 'Fale conosco',
          address: 'Rua Exemplo, 123 — São Paulo, SP',
          phone: '(11) 3333-0000',
          whatsapp: '(11) 99999-0000',
        },
        footer: {
          copyright: '© Academia Teste — RingPro',
        },
      },
    },
    { onConflict: 'academy_id' },
  )

  const due = new Date()
  due.setDate(due.getDate() + 10)
  const { error: saasInvoiceError } = await supabase.from('saas_invoices').upsert(
    {
      academy_id: ACADEMY_ID,
      amount: 99,
      due_date: due.toISOString().slice(0, 10),
      status: 'PENDENTE',
    },
    { onConflict: 'academy_id', ignoreDuplicates: true },
  )
  if (saasInvoiceError) {
    // ignora se já existir ou constraint diferente
  }

  for (const u of users) {
    await ensureUser(u)
  }

  const { data: studentUser } = await supabase.auth.admin.listUsers()
  const aluno = studentUser?.users?.find((u) => u.email === 'aluno@academia-teste.dev')
  if (aluno) {
    await supabase.from('students').upsert(
      {
        user_id: aluno.id,
        academy_id: ACADEMY_ID,
        phone: '(11) 99999-0000',
        status: 'ATIVO',
        enrollment_date: isoDateMonthsAgo(3),
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,academy_id' },
    )

    const { data: cats } = await supabase
      .from('training_categories')
      .select('id')
      .eq('academy_id', ACADEMY_ID)
      .limit(1)

    if (!cats?.length) {
      await supabase.from('training_categories').insert([
        { academy_id: ACADEMY_ID, name: 'Boxe', color: '#B91C1C' },
        { academy_id: ACADEMY_ID, name: 'Muay Thai', color: '#D97706' },
      ])
    }

    const { data: plans } = await supabase
      .from('academy_plans')
      .select('id')
      .eq('academy_id', ACADEMY_ID)
      .limit(1)

    if (!plans?.length) {
      await supabase.from('academy_plans').insert({
        academy_id: ACADEMY_ID,
        name: 'Plano Básico',
        price: 149.9,
        period: 'MENSAL',
        plan_kind: 'GROUP',
        max_categories: 2,
        is_public: true,
      })
      await supabase.from('academy_plans').insert({
        academy_id: ACADEMY_ID,
        name: 'Individual Boxe',
        description: 'Aulas particulares de boxe — 1 modalidade',
        price: 299.9,
        period: 'MENSAL',
        plan_kind: 'INDIVIDUAL',
        max_categories: 1,
        is_public: true,
      })
    }

    const { data: planRow } = await supabase
      .from('academy_plans')
      .select('id, price')
      .eq('academy_id', ACADEMY_ID)
      .limit(1)
      .maybeSingle()

    const { data: studentRow } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', aluno.id)
      .eq('academy_id', ACADEMY_ID)
      .maybeSingle()

    if (studentRow && planRow) {
      const nextBill = new Date()
      nextBill.setMonth(nextBill.getMonth() + 1)
      const { error: subError } = await supabase.from('student_subscriptions').upsert(
        {
          student_id: studentRow.id,
          academy_plan_id: planRow.id,
          next_billing_date: nextBill.toISOString().slice(0, 10),
          status: 'ATIVO',
        },
        { onConflict: 'student_id', ignoreDuplicates: true },
      )
      if (subError) {
        const { data: existing } = await supabase
          .from('student_subscriptions')
          .select('id')
          .eq('student_id', studentRow.id)
          .maybeSingle()
        if (!existing) {
          await supabase.from('student_subscriptions').insert({
            student_id: studentRow.id,
            academy_plan_id: planRow.id,
            next_billing_date: nextBill.toISOString().slice(0, 10),
            status: 'ATIVO',
          })
        }
      }

      const due = new Date()
      due.setDate(due.getDate() + 5)
      const { data: inv } = await supabase
        .from('academy_invoices')
        .select('id')
        .eq('student_id', studentRow.id)
        .eq('status', 'PENDENTE')
        .maybeSingle()
      if (!inv) {
        await supabase.from('academy_invoices').insert({
          academy_id: ACADEMY_ID,
          student_id: studentRow.id,
          amount: planRow.price,
          due_date: due.toISOString().slice(0, 10),
          status: 'PENDENTE',
        })
      }
    }
  }

  await seedDashboardDemoData(ACADEMY_ID)
  await linkProfessorToCategories(ACADEMY_ID)
  await linkDemoStudentsToCategories(ACADEMY_ID)
  await seedGraduationLevels(ACADEMY_ID)
  await seedClassGroups(ACADEMY_ID)

  console.log('\nSenha dev para todos:', PASSWORD)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
