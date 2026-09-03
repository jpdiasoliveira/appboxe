import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import type { StudentContext as StudentCtx } from '../lib/student-types'

interface StudentContextValue {
  student: StudentCtx | null
  academyId: string | null
  loading: boolean
  needsOnboarding: boolean
  refresh: () => Promise<void>
}

const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth()
  const [student, setStudent] = useState<StudentCtx | null>(null)
  const [loading, setLoading] = useState(true)

  const studentRole = useMemo(
    () => roles.find((r) => r.role === 'STUDENT' && r.status === 'ATIVO'),
    [roles],
  )

  const load = useCallback(async () => {
    if (!user || !studentRole?.academy_id) {
      setStudent(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('students')
      .select('*, academy:academies(name, slug)')
      .eq('user_id', user.id)
      .eq('academy_id', studentRole.academy_id)
      .maybeSingle()

    if (error || !data) {
      setStudent(null)
    } else {
      const academy = data.academy as { name: string; slug: string } | { name: string; slug: string }[] | null
      const ac = Array.isArray(academy) ? academy[0] : academy
      setStudent({
        id: data.id,
        user_id: data.user_id,
        academy_id: data.academy_id,
        status: data.status,
        phone: data.phone,
        birth_date: data.birth_date ?? null,
        weight_kg: data.weight_kg != null ? Number(data.weight_kg) : null,
        height_cm: data.height_cm != null ? Number(data.height_cm) : null,
        emergency_contact_name: data.emergency_contact_name ?? null,
        emergency_contact_phone: data.emergency_contact_phone ?? null,
        enrollment_date: data.enrollment_date,
        onboarding_completed_at: data.onboarding_completed_at ?? null,
        academy: ac ?? undefined,
      })
    }
    setLoading(false)
  }, [user, studentRole?.academy_id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <StudentContext.Provider
      value={{
        student,
        academyId: studentRole?.academy_id ?? null,
        loading,
        needsOnboarding: Boolean(student && !student.onboarding_completed_at),
        refresh: load,
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudentContext() {
  const ctx = useContext(StudentContext)
  if (!ctx) throw new Error('useStudentContext must be used within StudentProvider')
  return ctx
}
