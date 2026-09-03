import type { InvoiceStatus, StudentStatus } from './types'

export type PlanPeriod = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'

export interface StudentRow {
  id: string
  user_id: string
  academy_id: string
  cpf: string | null
  phone: string | null
  status: StudentStatus
  enrollment_date: string
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
  onboarding_completed_at?: string | null
  trial_ends_at?: string | null
  profile?: { name: string } | { name: string }[]
}

/** Aluno com metadados para filtros da lista (plano + categorias). */
export interface StudentListRow extends StudentRow {
  plan_id: string | null
  plan_name: string | null
  category_ids: string[]
}

export interface StudentSubscriptionSummary {
  id: string
  plan_id: string
  plan_name: string
  price: number
  period: PlanPeriod
  next_billing_date: string | null
  status: string
}

export interface StudentAttendanceSummaryRow {
  id: string
  class_date: string
  present: boolean
  category_name: string
}

export interface StudentDetailData {
  student: StudentRow & { profile_name: string }
  subscription: StudentSubscriptionSummary | null
  categories: { id: string; name: string; color: string | null }[]
  invoices: {
    id: string
    amount: number
    due_date: string
    status: InvoiceStatus
  }[]
  attendance: StudentAttendanceSummaryRow[]
}

export type PlanKind = 'GROUP' | 'INDIVIDUAL'

export interface PlanPriceHistoryRow {
  id: string
  price: number
  created_at: string
  note?: string | null
}

export interface PlanCategoryLink {
  id: string
  name: string
}

export interface AcademyPlanRow {
  id: string
  academy_id: string
  name: string
  description?: string | null
  price: number
  period: PlanPeriod
  plan_kind: PlanKind
  max_categories: number
  is_public: boolean
  status: string
  enrollment_fee?: number | null
  trial_days?: number | null
  first_class_free?: boolean
  annual_discount_pct?: number | null
  max_classes_per_week?: number | null
  active_subscribers?: number
  linked_categories?: PlanCategoryLink[]
  price_history?: PlanPriceHistoryRow[]
}

export interface TrainingCategoryRow {
  id: string
  academy_id: string
  name: string
  description: string | null
  color: string | null
  status: string
  max_capacity: number | null
  schedule_label: string | null
  image_url: string | null
}

export interface CategoryInstructorSummary {
  user_id: string
  name: string
}

export interface CategoryStudentSummary {
  id: string
  name: string
  status: string
}

export interface CategoryOverviewRow extends TrainingCategoryRow {
  student_count: number
  sessions_this_week: number
  attendance_rate_pct: number | null
  revenue_month: number | null
  instructors: CategoryInstructorSummary[]
  students: CategoryStudentSummary[]
}

export interface InstructorRow {
  id: string
  user_id: string
  academy_id: string
  bio: string | null
  specialties: string[]
  status: string
  profile?: { name: string } | { name: string }[]
  role?: string
}

export interface AcademyInvoiceRow {
  id: string
  academy_id: string
  student_id: string
  amount: number
  due_date: string
  status: InvoiceStatus
  student?: {
    id: string
    user_id: string
    phone?: string | null
    profile?: { name: string } | { name: string }[]
  } | {
    id: string
    user_id: string
    phone?: string | null
    profile?: { name: string } | { name: string }[]
  }[]
}

export interface StudentEditFormData {
  student: StudentRow & { profile_name: string }
  planId: string | null
  categoryIds: string[]
}

export interface StudentBirthdayEntry {
  id: string
  name: string
  birth_date: string
  status: StudentStatus
}

export interface AcademyKpis {
  alunosAtivos: number
  inadimplencia: number
  receitaMes: number
  turmasHoje: number
}

export interface ChartMonthPoint {
  month: string
  value: number
}

export interface AcademyChartData {
  activeByMonth: ChartMonthPoint[]
  delinquencyPct: number
  revenueByMonth: ChartMonthPoint[]
}
