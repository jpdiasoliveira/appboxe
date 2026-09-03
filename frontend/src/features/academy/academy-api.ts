import { supabase } from '../../lib/supabase'
import type { AttendanceReportRecord } from '../../lib/attendance-report'
import { normalizePhoneForStorage } from '../../lib/phone-utils'
import { appendBodyMetric } from '../../lib/body-metrics-api'
import { shouldRecordBodyMetric } from '../../lib/body-metrics-types'
import { STUDENT_ATTENDANCE_STATUSES } from '../../lib/student-status'
import type {
  AcademyChartData,
  AcademyInvoiceRow,
  AcademyKpis,
  AcademyPlanRow,
  CategoryOverviewRow,
  ChartMonthPoint,
  InstructorRow,
  PlanCategoryLink,
  PlanPeriod,
  PlanPriceHistoryRow,
  StudentBirthdayEntry,
  StudentAttendanceSummaryRow,
  StudentDetailData,
  StudentEditFormData,
  StudentRow,
  StudentListRow,
  TrainingCategoryRow,
} from '../../lib/academy-types'
import type { FinanceReportFilters, FinanceReportRow } from '../../lib/finance-report'

export async function fetchAcademyKpis(
  academyId: string,
  includeFinance: boolean,
): Promise<AcademyKpis> {
  const { count: alunosAtivos } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')

  const { count: inadimplencia } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('status', 'INADIMPLENTE')

  let receitaMes = 0
  if (includeFinance) {
    const start = new Date()
    start.setDate(1)
    const { data: paid } = await supabase
      .from('academy_invoices')
      .select('amount')
      .eq('academy_id', academyId)
      .eq('status', 'PAGO')
      .gte('created_at', start.toISOString())
    receitaMes = (paid ?? []).reduce((s, r) => s + Number(r.amount), 0)
  }

  const today = new Date().toISOString().slice(0, 10)
  const { count: turmasHoje } = await supabase
    .from('attendance_records')
    .select('training_category_id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('class_date', today)

  return {
    alunosAtivos: alunosAtivos ?? 0,
    inadimplencia: inadimplencia ?? 0,
    receitaMes,
    turmasHoje: turmasHoje ?? 0,
  }
}

export async function fetchAcademyCharts(
  academyId: string,
  includeFinance: boolean,
): Promise<AcademyChartData> {
  const { data, error } = await supabase.rpc('get_academy_dashboard_charts', {
    p_academy_id: academyId,
  })
  if (error) throw error

  const payload = data as {
    active_by_month?: ChartMonthPoint[]
    delinquency_pct?: number
    revenue_by_month?: ChartMonthPoint[] | null
  }

  return {
    activeByMonth: (payload.active_by_month ?? []).map((row) => ({
      month: row.month,
      value: Number(row.value),
    })),
    delinquencyPct: Number(payload.delinquency_pct ?? 0),
    revenueByMonth: includeFinance
      ? (payload.revenue_by_month ?? []).map((row) => ({
          month: row.month,
          value: Number(row.value),
        }))
      : [],
  }
}

export async function fetchStudents(
  academyId: string,
  statusFilter?: string | string[],
): Promise<StudentRow[]> {
  let q = supabase
    .from('students')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })

  if (Array.isArray(statusFilter)) {
    if (statusFilter.length > 0) {
      q = q.in('status', statusFilter)
    }
  } else if (statusFilter && statusFilter !== 'TODOS') {
    q = q.eq('status', statusFilter)
  }

  const { data, error } = await q
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const userIds = rows.map((r) => r.user_id)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))

  return rows.map((r) => ({
    ...r,
    profile: { name: nameByUser.get(r.user_id) ?? '—' },
  })) as StudentRow[]
}

export async function fetchStudentsWithListMeta(academyId: string): Promise<StudentListRow[]> {
  const students = await fetchStudents(academyId)
  if (students.length === 0) return []

  const studentIds = students.map((s) => s.id)

  const [{ data: subs }, { data: cats }] = await Promise.all([
    supabase
      .from('student_subscriptions')
      .select('student_id, plan_id, academy_plans(name)')
      .in('student_id', studentIds)
      .eq('status', 'ATIVO'),
    supabase
      .from('student_categories')
      .select('student_id, training_category_id')
      .in('student_id', studentIds),
  ])

  const planByStudent = new Map<string, { plan_id: string; plan_name: string | null }>()
  for (const sub of subs ?? []) {
    const plan = sub.academy_plans as { name?: string } | { name?: string }[] | null
    const planName = Array.isArray(plan) ? plan[0]?.name : plan?.name
    planByStudent.set(sub.student_id as string, {
      plan_id: sub.plan_id as string,
      plan_name: planName ?? null,
    })
  }

  const categoriesByStudent = new Map<string, string[]>()
  for (const row of cats ?? []) {
    const sid = row.student_id as string
    const list = categoriesByStudent.get(sid) ?? []
    list.push(row.training_category_id as string)
    categoriesByStudent.set(sid, list)
  }

  return students.map((student) => {
    const plan = planByStudent.get(student.id)
    return {
      ...student,
      plan_id: plan?.plan_id ?? null,
      plan_name: plan?.plan_name ?? null,
      category_ids: categoriesByStudent.get(student.id) ?? [],
    }
  })
}

export async function fetchStudentsForAttendance(academyId: string): Promise<StudentRow[]> {
  return fetchStudents(academyId, [...STUDENT_ATTENDANCE_STATUSES])
}

export async function fetchStudentBirthdays(academyId: string): Promise<StudentBirthdayEntry[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, user_id, birth_date, status')
    .eq('academy_id', academyId)
    .not('birth_date', 'is', null)
    .in('status', ['ATIVO', 'TRIAL', 'INADIMPLENTE'])
    .order('birth_date')

  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const userIds = rows.map((r) => r.user_id)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))

  return rows.map((r) => ({
    id: r.id as string,
    name: nameByUser.get(r.user_id as string) ?? '—',
    birth_date: r.birth_date as string,
    status: r.status as StudentBirthdayEntry['status'],
  }))
}

/** Dados mínimos para o modal de edição — sem faturas, presença ou gráficos. */
export async function fetchStudentEditFormData(
  academyId: string,
  studentId: string,
): Promise<StudentEditFormData> {
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .single()

  if (error) throw error

  const [{ data: profile }, { data: sub }, { data: catLinks }] = await Promise.all([
    supabase.from('profiles').select('name').eq('user_id', student.user_id).maybeSingle(),
    supabase
      .from('student_subscriptions')
      .select('academy_plan_id')
      .eq('student_id', studentId)
      .eq('status', 'ATIVO')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('student_categories').select('training_category_id').eq('student_id', studentId),
  ])

  return {
    student: {
      ...(student as StudentRow),
      profile_name: profile?.name ?? '—',
    },
    planId: (sub?.academy_plan_id as string | undefined) ?? null,
    categoryIds: (catLinks ?? []).map((c) => c.training_category_id as string),
  }
}

export async function fetchStudentDetail(
  academyId: string,
  studentId: string,
  includeFinance: boolean,
): Promise<StudentDetailData> {
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .single()

  if (error) throw error

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('user_id', student.user_id)
    .maybeSingle()

  const { data: sub } = await supabase
    .from('student_subscriptions')
    .select('id, status, next_billing_date, academy_plan_id, plan:academy_plans(id, name, price, period)')
    .eq('student_id', studentId)
    .eq('status', 'ATIVO')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let subscription: StudentDetailData['subscription'] = null
  if (sub?.plan) {
    const plan = sub.plan as
      | { id: string; name: string; price: number; period: PlanPeriod }
      | { id: string; name: string; price: number; period: PlanPeriod }[]
    const p = Array.isArray(plan) ? plan[0] : plan
    if (p) {
      subscription = {
        id: sub.id,
        plan_id: sub.academy_plan_id as string,
        plan_name: p.name,
        price: Number(p.price),
        period: p.period,
        next_billing_date: sub.next_billing_date,
        status: sub.status,
      }
    }
  }

  const { data: catLinks } = await supabase
    .from('student_categories')
    .select('category:training_categories(id, name, color)')
    .eq('student_id', studentId)

  const categories = (catLinks ?? [])
    .map((c) => {
      const cat = c.category as { id: string; name: string; color: string | null } | { id: string; name: string; color: string | null }[]
      return Array.isArray(cat) ? cat[0] : cat
    })
    .filter(Boolean) as { id: string; name: string; color: string | null }[]

  let invoices: StudentDetailData['invoices'] = []
  if (includeFinance) {
    const { data: invRows, error: invErr } = await supabase
      .from('academy_invoices')
      .select('id, amount, due_date, status')
      .eq('student_id', studentId)
      .eq('academy_id', academyId)
      .order('due_date', { ascending: false })
      .limit(24)
    if (invErr) throw invErr
    invoices = (invRows ?? []) as StudentDetailData['invoices']
  }

  const { data: attRows } = await supabase
    .from('attendance_records')
    .select('id, class_date, present, category:training_categories(name)')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .order('class_date', { ascending: false })
    .limit(20)

  const attendance = (attRows ?? []).map((row) => {
    const cat = row.category as { name: string } | { name: string }[]
    const name = Array.isArray(cat) ? cat[0]?.name : cat?.name
    return {
      id: row.id as string,
      class_date: row.class_date as string,
      present: row.present as boolean,
      category_name: name ?? '—',
    }
  })

  return {
    student: {
      ...(student as StudentRow),
      profile_name: profile?.name ?? '—',
    },
    subscription,
    categories,
    invoices,
    attendance,
  }
}

export interface StudentHistorySummary {
  presentCount: number
  absentCount: number
  fightsCount: number
  sparringSessions: number
  trainingStartedAt: string | null
  enrollmentDate: string
}

export async function fetchStudentHistorySummary(
  academyId: string,
  studentId: string,
): Promise<{ summary: StudentHistorySummary; recentAttendance: StudentAttendanceSummaryRow[] }> {
  const { data: student, error } = await supabase
    .from('students')
    .select('fights_count, sparring_sessions, training_started_at, enrollment_date')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .single()

  if (error) throw error

  const { data: attRows } = await supabase
    .from('attendance_records')
    .select('id, class_date, present, category:training_categories(name)')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .order('class_date', { ascending: false })
    .limit(20)

  const recentAttendance = (attRows ?? []).map((row) => {
    const cat = row.category as { name: string } | { name: string }[]
    const categoryName = Array.isArray(cat) ? cat[0]?.name : cat?.name
    return {
      id: row.id as string,
      class_date: row.class_date as string,
      present: row.present as boolean,
      category_name: categoryName ?? '—',
    }
  })

  const presentCount = recentAttendance.filter((row) => row.present).length
  const absentCount = recentAttendance.length - presentCount

  return {
    summary: {
      presentCount,
      absentCount,
      fightsCount: Number(student.fights_count ?? 0),
      sparringSessions: Number(student.sparring_sessions ?? 0),
      trainingStartedAt: (student.training_started_at as string | null) ?? null,
      enrollmentDate: student.enrollment_date as string,
    },
    recentAttendance,
  }
}

export async function updateStudentByStaff(
  studentId: string,
  input: {
    name?: string
    phone?: string | null
    cpf?: string | null
    status?: StudentRow['status']
    birth_date?: string | null
    weight_kg?: number | null
    height_cm?: number | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
    fights_count?: number
    sparring_sessions?: number
    training_started_at?: string | null
    inactive_reason?: string | null
    inactive_at?: string | null
  },
) {
  const { name, ...studentFields } = input

  if (name !== undefined) {
    const { data: student } = await supabase
      .from('students')
      .select('user_id')
      .eq('id', studentId)
      .single()
    if (!student) throw new Error('Aluno não encontrado')
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Nome é obrigatório')
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name: trimmed })
      .eq('user_id', student.user_id)
    if (profileError) throw profileError
  }

  if (Object.keys(studentFields).length === 0) return

  if ('phone' in studentFields) {
    studentFields.phone = normalizePhoneForStorage(studentFields.phone)
  }
  if ('emergency_contact_phone' in studentFields) {
    studentFields.emergency_contact_phone = normalizePhoneForStorage(studentFields.emergency_contact_phone)
  }

  if ('weight_kg' in studentFields || 'height_cm' in studentFields) {
    const { data: current } = await supabase
      .from('students')
      .select('academy_id, weight_kg, height_cm')
      .eq('id', studentId)
      .single()

    const nextWeight =
      studentFields.weight_kg !== undefined
        ? studentFields.weight_kg
        : current?.weight_kg != null
          ? Number(current.weight_kg)
          : null
    const nextHeight =
      studentFields.height_cm !== undefined
        ? studentFields.height_cm
        : current?.height_cm != null
          ? Number(current.height_cm)
          : null

    if (
      current &&
      shouldRecordBodyMetric(
        {
          weight_kg: current.weight_kg != null ? Number(current.weight_kg) : null,
          height_cm: current.height_cm != null ? Number(current.height_cm) : null,
        },
        { weight_kg: nextWeight, height_cm: nextHeight },
      )
    ) {
      await appendBodyMetric({
        studentId,
        academyId: current.academy_id,
        weight_kg: nextWeight,
        height_cm: nextHeight,
        notes: 'Registrado pela academia',
      })
    }
  }

  const payload: Record<string, unknown> = { ...studentFields }

  if (payload.status === 'INATIVO') {
    const reason = typeof payload.inactive_reason === 'string' ? payload.inactive_reason.trim() : ''
    if (!reason) {
      const { data: current } = await supabase
        .from('students')
        .select('inactive_reason')
        .eq('id', studentId)
        .single()
      if (!current?.inactive_reason) {
        throw new Error('Informe o motivo da inativação')
      }
    } else {
      payload.inactive_reason = reason
      if (!payload.inactive_at) {
        payload.inactive_at = new Date().toISOString()
      }
    }
  } else if (payload.status && payload.status !== 'INATIVO') {
    payload.inactive_reason = null
    payload.inactive_at = null
  }

  const { error } = await supabase.from('students').update(payload).eq('id', studentId)
  if (error) throw error
}

export async function inactivateStudentByStaff(studentId: string, reason: string) {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('Informe o motivo da inativação')
  await updateStudentByStaff(studentId, {
    status: 'INATIVO',
    inactive_reason: trimmed,
    inactive_at: new Date().toISOString(),
  })
}

export async function batchInactivateStudentsByStaff(studentIds: string[], reason: string) {
  if (studentIds.length === 0) throw new Error('Selecione ao menos um aluno')
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('Informe o motivo da inativação')
  for (const studentId of studentIds) {
    await inactivateStudentByStaff(studentId, trimmed)
  }
}

export async function completeAcademyOnboarding(academyId: string) {
  await updateAcademySettings(academyId, { onboarding_completed: true })
}

export async function reactivateStudentByStaff(studentId: string) {
  await updateStudentByStaff(studentId, {
    status: 'ATIVO',
    inactive_reason: null,
    inactive_at: null,
  })
}

export async function fetchActivePlansForAssignment(academyId: string) {
  const { data, error } = await supabase
    .from('academy_plans')
    .select('id, name, price, period')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('price')
  if (error) throw error
  return (data ?? []) as { id: string; name: string; price: number; period: PlanPeriod }[]
}

export async function assignStudentPlanByStaff(studentId: string, planId: string) {
  const { data: existing } = await supabase
    .from('student_subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'ATIVO')
    .maybeSingle()

  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)
  const nextBillingDate = nextBilling.toISOString().slice(0, 10)

  if (existing) {
    const { error } = await supabase
      .from('student_subscriptions')
      .update({ academy_plan_id: planId, next_billing_date: nextBillingDate })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('student_subscriptions').insert({
      student_id: studentId,
      academy_plan_id: planId,
      next_billing_date: nextBillingDate,
      status: 'ATIVO',
    })
    if (error) throw error
  }
}

export async function updateStudentCategoriesByStaff(studentId: string, categoryIds: string[]) {
  await supabase.from('student_categories').delete().eq('student_id', studentId)
  if (categoryIds.length === 0) return
  const rows = categoryIds.map((training_category_id) => ({
    student_id: studentId,
    training_category_id,
  }))
  const { error } = await supabase.from('student_categories').insert(rows)
  if (error) throw error
}

export async function createStudent(input: {
  academyId: string
  email: string
  name: string
  cpf?: string
  phone?: string
  initialStatus?: 'ATIVO' | 'TRIAL'
  birth_date?: string | null
  weight_kg?: number | null
  height_cm?: number | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  fights_count?: number
  sparring_sessions?: number
  training_started_at?: string | null
}) {
  const { academyId, email, name, cpf, phone, initialStatus, ...extra } = input
  const normalizedPhone = normalizePhoneForStorage(phone)
  const { data, error } = await supabase.functions.invoke('create-student', {
    body: { academyId, email, name, cpf, phone: normalizedPhone, initialStatus },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)

  const studentId = (data as { studentId: string }).studentId
  const extraPayload = Object.fromEntries(
    Object.entries(extra).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
  if (Object.keys(extraPayload).length > 0) {
    await updateStudentByStaff(studentId, extraPayload)
  }

  return data as { studentId: string }
}

export async function fetchInstructors(academyId: string): Promise<InstructorRow[]> {
  const { data: roles, error } = await supabase
    .from('user_academy_roles')
    .select('user_id, role')
    .eq('academy_id', academyId)
    .in('role', ['PROFESSOR', 'ASSISTANT', 'SCHOOL_OWNER'])
    .eq('status', 'ATIVO')

  if (error) throw error
  const rows = roles ?? []
  if (rows.length === 0) return []

  const userIds = rows.map((r) => r.user_id)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))

  return rows.map((r) => ({
    id: r.user_id,
    user_id: r.user_id,
    academy_id: academyId,
    bio: null,
    specialties: [],
    status: 'ATIVO',
    profile: { name: nameByUser.get(r.user_id) ?? '—' },
    role: r.role as string,
  }))
}

export async function fetchCategories(academyId: string): Promise<TrainingCategoryRow[]> {
  const { data, error } = await supabase
    .from('training_categories')
    .select('*')
    .eq('academy_id', academyId)
    .order('name')
  if (error) throw error
  return (data ?? []) as TrainingCategoryRow[]
}

export async function fetchCategoryOverview(academyId: string): Promise<CategoryOverviewRow[]> {
  const { data, error } = await supabase.rpc('get_academy_category_overview', {
    p_academy_id: academyId,
  })
  if (error) throw error
  return ((data ?? []) as CategoryOverviewRow[]).map((row) => ({
    ...row,
    max_capacity: row.max_capacity ?? null,
    schedule_label: row.schedule_label ?? null,
    image_url: row.image_url ?? null,
    attendance_rate_pct: row.attendance_rate_pct ?? null,
    revenue_month: row.revenue_month ?? null,
    instructors: row.instructors ?? [],
    students: row.students ?? [],
  }))
}

export async function assignCategoryInstructor(
  academyId: string,
  categoryId: string,
  userId: string,
) {
  const { error } = await supabase.from('instructor_training_categories').insert({
    academy_id: academyId,
    training_category_id: categoryId,
    user_id: userId,
  })
  if (error) throw error
}

export async function removeCategoryInstructor(categoryId: string, userId: string) {
  const { error } = await supabase
    .from('instructor_training_categories')
    .delete()
    .eq('training_category_id', categoryId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function upsertCategory(
  academyId: string,
  input: {
    id?: string
    name: string
    description?: string | null
    color?: string
    status?: string
    max_capacity?: number | null
    schedule_label?: string | null
    image_url?: string | null
  },
) {
  const row = {
    name: input.name,
    description: input.description ?? null,
    color: input.color ?? '#B91C1C',
    status: input.status ?? 'ATIVO',
    max_capacity: input.max_capacity ?? null,
    schedule_label: input.schedule_label?.trim() || null,
    image_url: input.image_url?.trim() || null,
  }
  if (input.id) {
    const { error } = await supabase.from('training_categories').update(row).eq('id', input.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('training_categories').insert({
      academy_id: academyId,
      ...row,
    })
    if (error) throw error
  }
}

export async function fetchAcademyPlans(academyId: string): Promise<AcademyPlanRow[]> {
  const { data, error } = await supabase
    .from('academy_plans')
    .select('*')
    .eq('academy_id', academyId)
    .order('price')
  if (error) throw error
  const plans = (data ?? []) as AcademyPlanRow[]
  if (plans.length === 0) return []

  const planIds = plans.map((p) => p.id)

  const [{ data: students }, { data: subs }, { data: links }] = await Promise.all([
    supabase.from('students').select('id').eq('academy_id', academyId),
    supabase
      .from('student_subscriptions')
      .select('academy_plan_id, student_id')
      .in('academy_plan_id', planIds)
      .eq('status', 'ATIVO'),
    supabase
      .from('academy_plan_categories')
      .select('academy_plan_id, category:training_categories(id, name)')
      .in('academy_plan_id', planIds),
  ])

  const studentIds = new Set((students ?? []).map((s) => s.id))
  const countByPlan = new Map<string, number>()
  for (const sub of subs ?? []) {
    if (!studentIds.has(sub.student_id)) continue
    const key = sub.academy_plan_id as string
    countByPlan.set(key, (countByPlan.get(key) ?? 0) + 1)
  }

  const categoriesByPlan = new Map<string, PlanCategoryLink[]>()
  for (const link of links ?? []) {
    const cat = link.category as { id: string; name: string } | { id: string; name: string }[] | null
    const row = Array.isArray(cat) ? cat[0] : cat
    if (!row) continue
    const list = categoriesByPlan.get(link.academy_plan_id) ?? []
    list.push({ id: row.id, name: row.name })
    categoriesByPlan.set(link.academy_plan_id, list)
  }

  return plans.map((plan) => ({
    ...plan,
    plan_kind: plan.plan_kind ?? 'GROUP',
    enrollment_fee: plan.enrollment_fee ?? null,
    trial_days: plan.trial_days ?? null,
    first_class_free: plan.first_class_free ?? false,
    annual_discount_pct: plan.annual_discount_pct ?? null,
    max_classes_per_week: plan.max_classes_per_week ?? null,
    active_subscribers: countByPlan.get(plan.id) ?? 0,
    linked_categories: categoriesByPlan.get(plan.id) ?? [],
  }))
}

export async function fetchPlanPriceHistory(planId: string): Promise<PlanPriceHistoryRow[]> {
  const { data, error } = await supabase
    .from('academy_plan_price_history')
    .select('id, price, created_at, note')
    .eq('academy_plan_id', planId)
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) throw error
  return (data ?? []) as PlanPriceHistoryRow[]
}

async function setPlanCategories(planId: string, categoryIds: string[]) {
  await supabase.from('academy_plan_categories').delete().eq('academy_plan_id', planId)
  if (categoryIds.length === 0) return
  const { error } = await supabase.from('academy_plan_categories').insert(
    categoryIds.map((training_category_id) => ({
      academy_plan_id: planId,
      training_category_id,
    })),
  )
  if (error) throw error
}

export async function upsertAcademyPlan(
  academyId: string,
  input: {
    id?: string
    name: string
    description?: string
    price: number
    period: AcademyPlanRow['period']
    plan_kind: AcademyPlanRow['plan_kind']
    max_categories: number
    is_public: boolean
    status?: string
    enrollment_fee?: number | null
    trial_days?: number | null
    first_class_free?: boolean
    annual_discount_pct?: number | null
    max_classes_per_week?: number | null
    linked_category_ids?: string[]
    price_change_note?: string
  },
) {
  const maxCategories = input.plan_kind === 'INDIVIDUAL' ? 1 : input.max_categories
  const row = {
    academy_id: academyId,
    name: input.name,
    description: input.description?.trim() || null,
    price: input.price,
    period: input.period,
    plan_kind: input.plan_kind,
    max_categories: maxCategories,
    is_public: input.is_public,
    status: input.status ?? 'ATIVO',
    enrollment_fee: input.enrollment_fee ?? null,
    trial_days: input.trial_days ?? null,
    first_class_free: input.first_class_free ?? false,
    annual_discount_pct: input.annual_discount_pct ?? null,
    max_classes_per_week: input.max_classes_per_week ?? null,
  }

  const { data: auth } = await supabase.auth.getUser()
  const userId = auth.user?.id ?? null

  if (input.id) {
    const { data: existing } = await supabase
      .from('academy_plans')
      .select('price')
      .eq('id', input.id)
      .maybeSingle()

    const { error } = await supabase.from('academy_plans').update(row).eq('id', input.id)
    if (error) throw error

    if (existing && Number(existing.price) !== input.price) {
      await supabase.from('academy_plan_price_history').insert({
        academy_plan_id: input.id,
        price: input.price,
        changed_by: userId,
        note: input.price_change_note?.trim() || null,
      })
    }

    await setPlanCategories(input.id, input.linked_category_ids ?? [])
    return input.id
  }

  const { data: created, error } = await supabase.from('academy_plans').insert(row).select('id').single()
  if (error) throw error

  await supabase.from('academy_plan_price_history').insert({
    academy_plan_id: created.id,
    price: input.price,
    changed_by: userId,
    note: 'Preço inicial',
  })

  await setPlanCategories(created.id, input.linked_category_ids ?? [])
  return created.id
}

export async function duplicateAcademyPlan(academyId: string, planId: string) {
  const { data: plan, error } = await supabase
    .from('academy_plans')
    .select('*')
    .eq('id', planId)
    .eq('academy_id', academyId)
    .single()
  if (error) throw error

  const { data: links } = await supabase
    .from('academy_plan_categories')
    .select('training_category_id')
    .eq('academy_plan_id', planId)

  const copyName = plan.name.endsWith(' (cópia)') ? `${plan.name} 2` : `${plan.name} (cópia)`

  await upsertAcademyPlan(academyId, {
    name: copyName,
    description: plan.description ?? undefined,
    price: Number(plan.price),
    period: plan.period,
    plan_kind: plan.plan_kind ?? 'GROUP',
    max_categories: plan.max_categories,
    is_public: plan.is_public,
    status: 'ATIVO',
    enrollment_fee: plan.enrollment_fee != null ? Number(plan.enrollment_fee) : null,
    trial_days: plan.trial_days,
    first_class_free: plan.first_class_free ?? false,
    annual_discount_pct: plan.annual_discount_pct != null ? Number(plan.annual_discount_pct) : null,
    max_classes_per_week: plan.max_classes_per_week,
    linked_category_ids: (links ?? []).map((l) => l.training_category_id as string),
  })
}

export async function fetchAcademyInvoices(academyId: string): Promise<AcademyInvoiceRow[]> {
  const { data, error } = await supabase
    .from('academy_invoices')
    .select('*')
    .eq('academy_id', academyId)
    .order('due_date', { ascending: false })
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const studentIds = [...new Set(rows.map((r) => r.student_id))]
  const { data: students } = await supabase.from('students').select('id, user_id, phone').in('id', studentIds)
  const userIds = (students ?? []).map((s) => s.user_id)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))
  const studentById = new Map((students ?? []).map((s) => [s.id, s]))

  return rows.map((r) => {
    const student = studentById.get(r.student_id)
    const uid = student?.user_id
    return {
      ...r,
      student: {
        id: r.student_id,
        user_id: uid ?? '',
        phone: student?.phone ?? null,
        profile: { name: uid ? nameByUser.get(uid) ?? '—' : '—' },
      },
    }
  }) as AcademyInvoiceRow[]
}

export async function fetchAcademyFinanceReport(
  academyId: string,
  filters: FinanceReportFilters,
): Promise<FinanceReportRow[]> {
  let studentIdsFilter: string[] | null = null
  if (filters.categoryId) {
    const { data: categoryStudents, error: categoryError } = await supabase
      .from('student_categories')
      .select('student_id')
      .eq('training_category_id', filters.categoryId)
    if (categoryError) throw categoryError
    studentIdsFilter = [...new Set((categoryStudents ?? []).map((row) => row.student_id as string))]
    if (studentIdsFilter.length === 0) return []
  }

  let query = supabase
    .from('academy_invoices')
    .select('id, student_id, amount, due_date, status, academy_payments(method, paid_at, status)')
    .eq('academy_id', academyId)
    .gte('due_date', filters.fromDate)
    .lte('due_date', filters.toDate)
    .order('due_date', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (studentIdsFilter) {
    query = query.in('student_id', studentIdsFilter)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const studentIds = [...new Set(rows.map((row) => row.student_id as string))]
  const { data: students } = await supabase
    .from('students')
    .select('id, user_id')
    .in('id', studentIds)
  const userIds = (students ?? []).map((student) => student.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, name')
    .in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.name]))
  const nameByStudent = new Map(
    (students ?? []).map((student) => [
      student.id,
      nameByUser.get(student.user_id) ?? '—',
    ]),
  )

  const { data: studentCategories } = await supabase
    .from('student_categories')
    .select('student_id, training_category:training_categories(name)')
    .in('student_id', studentIds)
  const categoriesByStudent = new Map<string, string[]>()
  for (const row of studentCategories ?? []) {
    const category = row.training_category as { name: string } | { name: string }[] | null
    const name = Array.isArray(category) ? category[0]?.name : category?.name
    if (!name) continue
    const list = categoriesByStudent.get(row.student_id as string) ?? []
    list.push(name)
    categoriesByStudent.set(row.student_id as string, list)
  }

  return rows.map((row) => {
    const payments = row.academy_payments as
      | Array<{ method: string; paid_at: string | null; status: string }>
      | null
    const paidPayment =
      payments?.find((payment) => payment.status === 'PAGO') ?? payments?.[0] ?? null

    return {
      id: row.id as string,
      studentId: row.student_id as string,
      studentName: nameByStudent.get(row.student_id as string) ?? '—',
      categoryNames: (categoriesByStudent.get(row.student_id as string) ?? []).join(', ') || '—',
      amount: Number(row.amount),
      dueDate: row.due_date as string,
      status: row.status as FinanceReportRow['status'],
      paymentMethod: paidPayment?.method ?? null,
      paidAt: paidPayment?.paid_at ?? null,
    }
  })
}

export async function markAcademyInvoicePaidCash(invoiceId: string) {
  const { data, error } = await supabase.rpc('mark_academy_invoice_paid_cash', {
    p_invoice_id: invoiceId,
  })
  if (error) throw error
  return data
}

export async function recordAttendance(input: {
  academyId: string
  studentId: string
  categoryId: string
  classDate: string
  present: boolean
  classGroupId?: string
}) {
  const { data: user } = await supabase.auth.getUser()
  const row = {
    academy_id: input.academyId,
    student_id: input.studentId,
    training_category_id: input.categoryId,
    class_date: input.classDate,
    present: input.present,
    recorded_by: user.user?.id ?? null,
    class_group_id: input.classGroupId ?? null,
  }

  if (input.classGroupId) {
    const { error } = await supabase.from('attendance_records').upsert(row, {
      onConflict: 'student_id,class_group_id,class_date',
    })
    if (error) throw error
    return
  }

  const { error } = await supabase.from('attendance_records').upsert(row, {
    onConflict: 'student_id,training_category_id,class_date',
  })
  if (error) throw error
}

export async function fetchAttendanceForDate(
  academyId: string,
  categoryId: string,
  classDate: string,
) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('academy_id', academyId)
    .eq('training_category_id', categoryId)
    .eq('class_date', classDate)
  if (error) throw error
  return data ?? []
}

export async function fetchAttendanceReportRecords(
  academyId: string,
  fromDate: string,
  toDate: string,
  categoryId?: string,
): Promise<AttendanceReportRecord[]> {
  let query = supabase
    .from('attendance_records')
    .select(
      'student_id, training_category_id, class_date, present, category:training_categories(id, name)',
    )
    .eq('academy_id', academyId)
    .gte('class_date', fromDate)
    .lte('class_date', toDate)
    .order('class_date', { ascending: false })

  if (categoryId) {
    query = query.eq('training_category_id', categoryId)
  }

  const { data, error } = await query
  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const studentIds = [...new Set(rows.map((r) => r.student_id as string))]
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, user_id')
    .in('id', studentIds)
  if (studentsError) throw studentsError

  const userIds = (students ?? []).map((s) => s.user_id as string)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))
  const nameByStudent = new Map(
    (students ?? []).map((s) => [s.id, nameByUser.get(s.user_id as string) ?? '—']),
  )

  return rows.map((row) => {
    const cat = row.category as { id: string; name: string } | { id: string; name: string }[]
    const category = Array.isArray(cat) ? cat[0] : cat
    return {
      studentId: row.student_id as string,
      studentName: nameByStudent.get(row.student_id as string) ?? '—',
      categoryId: row.training_category_id as string,
      categoryName: category?.name ?? '—',
      classDate: row.class_date as string,
      present: row.present as boolean,
    }
  })
}

export async function updateAcademySettings(
  academyId: string,
  partial: Record<string, unknown>,
) {
  const { data: current, error: fetchError } = await supabase
    .from('academies')
    .select('settings')
    .eq('id', academyId)
    .single()
  if (fetchError) throw fetchError

  const merged = {
    ...((current?.settings as Record<string, unknown>) ?? {}),
    ...partial,
  }

  const { error } = await supabase
    .from('academies')
    .update({ settings: merged })
    .eq('id', academyId)
  if (error) throw error
}

export async function fetchAcademySettings(academyId: string) {
  const { data, error } = await supabase
    .from('academies')
    .select('name, slug, settings')
    .eq('id', academyId)
    .single()
  if (error) throw error
  return data
}

export interface AcademyBranchRow {
  id: string
  academy_id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  status: import('../../lib/types').AcademyStatus
  created_at: string
}

export async function fetchAcademyBranches(academyId: string): Promise<AcademyBranchRow[]> {
  const { data, error } = await supabase
    .from('academy_branches')
    .select('*')
    .eq('academy_id', academyId)
    .order('name')
  if (error) throw error
  return (data ?? []) as AcademyBranchRow[]
}

export async function upsertAcademyBranch(
  academyId: string,
  input: {
    id?: string
    name: string
    slug: string
    address?: string | null
    phone?: string | null
    status?: import('../../lib/types').AcademyStatus
  },
) {
  const row = {
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase().replace(/\s+/g, '-'),
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    status: input.status ?? 'ATIVO',
  }
  if (input.id) {
    const { error } = await supabase.from('academy_branches').update(row).eq('id', input.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('academy_branches').insert({
      academy_id: academyId,
      ...row,
    })
    if (error) throw error
  }
}
