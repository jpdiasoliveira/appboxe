import type { InvoiceStatus, StudentStatus } from './types'
import type { PlanPeriod } from './academy-types'

export interface StudentContext {
  id: string
  user_id: string
  academy_id: string
  branch_id?: string | null
  status: StudentStatus
  phone: string | null
  birth_date: string | null
  weight_kg: number | null
  height_cm: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  enrollment_date: string
  onboarding_completed_at: string | null
  academy?: { name: string; slug: string }
}

export interface StudentSubscription {
  id: string
  student_id: string
  academy_plan_id: string
  start_date: string
  next_billing_date: string | null
  status: string
  plan?: AcademyPlanPublic
}

export interface AcademyPlanPublic {
  id: string
  name: string
  price: number
  period: PlanPeriod
  max_categories: number
}

export interface StudentInvoice {
  id: string
  amount: number
  due_date: string
  status: InvoiceStatus
  created_at: string
}

export interface PaymentMethodRow {
  id: string
  brand: string | null
  last_four: string | null
  is_default: boolean
}

export interface StudentDashboardData {
  student: StudentContext
  subscription: StudentSubscription | null
  categories: { id: string; name: string; color: string | null }[]
  pendingInvoice: StudentInvoice | null
}
