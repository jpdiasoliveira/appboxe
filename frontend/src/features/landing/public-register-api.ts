import { supabase } from '../../lib/supabase'

export async function publicStudentRegister(input: {
  academyId: string
  slug?: string
  email: string
  name: string
  password: string
  phone?: string
}) {
  const { data, error } = await supabase.functions.invoke('public-student-register', {
    body: input,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as { studentId: string; email: string }
}
