import { supabase } from '../../lib/supabase'
import { appendBodyMetric } from '../../lib/body-metrics-api'
import { shouldRecordBodyMetric } from '../../lib/body-metrics-types'
import { getPaymentService } from '../../lib/payments'
import type { ChargeResult, TokenizeCardInput } from '../../lib/payments'
import { normalizePhoneForStorage } from '../../lib/phone-utils'
import type {
  AcademyPlanPublic,
  PaymentMethodRow,
  StudentDashboardData,
  StudentInvoice,
  StudentSubscription,
} from '../../lib/student-types'

export async function fetchStudentDashboard(studentId: string): Promise<StudentDashboardData> {
  const { data: student, error } = await supabase
    .from('students')
    .select('*, academy:academies(name, slug)')
    .eq('id', studentId)
    .single()

  if (error) throw error

  const academy = student.academy as { name: string; slug: string } | { name: string; slug: string }[] | null
  const ac = Array.isArray(academy) ? academy[0] : academy

  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select('*, plan:academy_plans(id, name, price, period, max_categories)')
    .eq('student_id', studentId)
    .eq('status', 'ATIVO')
    .order('created_at', { ascending: false })
    .limit(1)

  const sub = subs?.[0] as StudentSubscription | undefined
  if (sub?.plan) {
    const p = sub.plan as AcademyPlanPublic | AcademyPlanPublic[]
    sub.plan = Array.isArray(p) ? p[0] : p
  }

  const { data: catLinks } = await supabase
    .from('student_categories')
    .select('category:training_categories(id, name, color)')
    .eq('student_id', studentId)

  const categories = (catLinks ?? []).map((c) => {
    const cat = c.category as { id: string; name: string; color: string | null } | { id: string; name: string; color: string | null }[]
    return Array.isArray(cat) ? cat[0] : cat
  }).filter(Boolean)

  const { data: pending } = await supabase
    .from('academy_invoices')
    .select('*')
    .eq('student_id', studentId)
    .in('status', ['PENDENTE', 'ATRASADO'])
    .order('due_date', { ascending: true })
    .limit(1)

  return {
    student: {
      id: student.id,
      user_id: student.user_id,
      academy_id: student.academy_id,
      status: student.status,
      phone: student.phone,
      birth_date: student.birth_date ?? null,
      weight_kg: student.weight_kg != null ? Number(student.weight_kg) : null,
      height_cm: student.height_cm != null ? Number(student.height_cm) : null,
      emergency_contact_name: student.emergency_contact_name ?? null,
      emergency_contact_phone: student.emergency_contact_phone ?? null,
      enrollment_date: student.enrollment_date,
      onboarding_completed_at: student.onboarding_completed_at ?? null,
      academy: ac ?? undefined,
    },
    subscription: sub ?? null,
    categories,
    pendingInvoice: (pending?.[0] as StudentInvoice) ?? null,
  }
}

export async function fetchPublicPlans(academyId: string): Promise<AcademyPlanPublic[]> {
  const { data, error } = await supabase
    .from('academy_plans')
    .select('id, name, price, period, max_categories')
    .eq('academy_id', academyId)
    .eq('is_public', true)
    .eq('status', 'ATIVO')
    .order('price')
  if (error) throw error
  return (data ?? []) as AcademyPlanPublic[]
}

export async function fetchAllCategories(academyId: string) {
  const { data, error } = await supabase
    .from('training_categories')
    .select('id, name, color')
    .eq('academy_id', academyId)
    .eq('status', 'ATIVO')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function selectPlan(studentId: string, planId: string) {
  const { data: existing } = await supabase
    .from('student_subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'ATIVO')
    .maybeSingle()

  const nextBilling = new Date()
  nextBilling.setMonth(nextBilling.getMonth() + 1)

  if (existing) {
    const { error } = await supabase
      .from('student_subscriptions')
      .update({ academy_plan_id: planId, next_billing_date: nextBilling.toISOString().slice(0, 10) })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase.from('student_subscriptions').insert({
      student_id: studentId,
      academy_plan_id: planId,
      next_billing_date: nextBilling.toISOString().slice(0, 10),
      status: 'ATIVO',
    })
    if (error) throw error
  }
}

export async function setStudentCategories(studentId: string, categoryIds: string[]) {
  await supabase.from('student_categories').delete().eq('student_id', studentId)
  if (categoryIds.length === 0) return
  const rows = categoryIds.map((training_category_id) => ({
    student_id: studentId,
    training_category_id,
  }))
  const { error } = await supabase.from('student_categories').insert(rows)
  if (error) throw error
}

export async function fetchPaymentMethods(studentId: string): Promise<PaymentMethodRow[]> {
  const { data, error } = await supabase
    .from('student_payment_methods')
    .select('id, brand, last_four, is_default')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PaymentMethodRow[]
}

export async function savePaymentMethod(studentId: string, input: TokenizeCardInput) {
  const tokenized = await getPaymentService().tokenizeCard(input)
  await supabase.from('student_payment_methods').delete().eq('student_id', studentId)
  const { error } = await supabase.from('student_payment_methods').insert({
    student_id: studentId,
    gateway: tokenized.gateway,
    gateway_token: tokenized.token,
    brand: tokenized.brand,
    last_four: tokenized.lastFour,
    is_default: true,
  })
  if (error) throw error
}

/** @deprecated use savePaymentMethod */
export async function saveMockCard(studentId: string, lastFour: string) {
  return savePaymentMethod(studentId, { lastFour })
}

export async function fetchInvoiceHistory(studentId: string): Promise<StudentInvoice[]> {
  const { data, error } = await supabase
    .from('academy_invoices')
    .select('id, amount, due_date, status, created_at')
    .eq('student_id', studentId)
    .order('due_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as StudentInvoice[]
}

export async function createPendingInvoice(studentId: string) {
  const { error } = await supabase.rpc('create_student_onboarding_invoice', {
    p_student_id: studentId,
  })
  if (error) throw error
}

export async function simulatePayment(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('simulate-payment', {
    body: { invoiceId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
}

export async function createPaymentCharge(
  invoiceId: string,
  method: 'PIX' | 'BOLETO',
): Promise<ChargeResult> {
  const payments = getPaymentService()
  return method === 'BOLETO' ? payments.createBoleto(invoiceId) : payments.createPix(invoiceId)
}

export async function updateStudentProfile(
  studentId: string,
  input: {
    phone?: string
    birth_date?: string | null
    weight_kg?: number | null
    height_cm?: number | null
    emergency_contact_name?: string | null
    emergency_contact_phone?: string | null
  },
) {
  const { data: current } = await supabase
    .from('students')
    .select('academy_id, weight_kg, height_cm')
    .eq('id', studentId)
    .single()

  const nextWeight = input.weight_kg !== undefined ? input.weight_kg : (current?.weight_kg != null ? Number(current.weight_kg) : null)
  const nextHeight = input.height_cm !== undefined ? input.height_cm : (current?.height_cm != null ? Number(current.height_cm) : null)

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
    })
  }

  const payload = {
    ...input,
    phone: input.phone !== undefined ? normalizePhoneForStorage(input.phone) : undefined,
    emergency_contact_phone:
      input.emergency_contact_phone !== undefined
        ? normalizePhoneForStorage(input.emergency_contact_phone)
        : undefined,
  }

  const { error } = await supabase.from('students').update(payload).eq('id', studentId)
  if (error) throw error
}

export async function completeStudentOnboarding(studentId: string) {
  const { error } = await supabase
    .from('students')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', studentId)
  if (error) throw error
}
