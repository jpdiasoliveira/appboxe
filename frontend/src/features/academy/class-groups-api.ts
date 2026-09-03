import { supabase } from '../../lib/supabase'
import type { ClassGroupMemberRow, ClassGroupRow } from '../../lib/class-group-types'

export async function fetchClassGroups(academyId: string): Promise<ClassGroupRow[]> {
  const { data, error } = await supabase
    .from('class_groups')
    .select(
      `
      *,
      training_categories(name, color),
      class_group_members(count)
    `,
    )
    .eq('academy_id', academyId)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const members = raw.class_group_members as { count: number }[] | { count: number } | null | undefined
    const count = Array.isArray(members) ? members[0]?.count ?? 0 : members?.count ?? 0
    return {
      ...(row as Omit<ClassGroupRow, 'training_category' | 'member_count'>),
      training_category: raw.training_categories as ClassGroupRow['training_category'],
      member_count: count,
    }
  })
}

export async function fetchClassGroup(groupId: string): Promise<ClassGroupRow | null> {
  const { data, error } = await supabase
    .from('class_groups')
    .select(
      `
      *,
      training_categories(name, color),
      class_group_members(count)
    `,
    )
    .eq('id', groupId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const raw = data as Record<string, unknown>
  const members = raw.class_group_members as { count: number }[] | { count: number } | null | undefined
  const count = Array.isArray(members) ? members[0]?.count ?? 0 : members?.count ?? 0
  return {
    ...(data as Omit<ClassGroupRow, 'training_category' | 'member_count'>),
    training_category: raw.training_categories as ClassGroupRow['training_category'],
    member_count: count,
  }
}

export async function upsertClassGroup(input: {
  academyId: string
  id?: string
  trainingCategoryId: string
  name: string
  description?: string | null
  maxStudents?: number
  instructorUserId?: string | null
  branchId?: string | null
  scheduleHint?: Record<string, unknown>
  status?: ClassGroupRow['status']
}): Promise<string> {
  const row = {
    academy_id: input.academyId,
    training_category_id: input.trainingCategoryId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    max_students: input.maxStudents ?? 20,
    instructor_user_id: input.instructorUserId ?? null,
    branch_id: input.branchId ?? null,
    schedule_hint: input.scheduleHint ?? {},
    status: input.status ?? 'ATIVO',
  }

  if (input.id) {
    const { error } = await supabase.from('class_groups').update(row).eq('id', input.id)
    if (error) throw error
    return input.id
  }

  const { data, error } = await supabase.from('class_groups').insert(row).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function fetchClassGroupMembers(classGroupId: string): Promise<ClassGroupMemberRow[]> {
  const { data, error } = await supabase
    .from('class_group_members')
    .select('id, class_group_id, student_id, joined_at')
    .eq('class_group_id', classGroupId)
    .order('joined_at', { ascending: false })

  if (error) throw error
  const rows = data ?? []
  if (rows.length === 0) return []

  const studentIds = rows.map((r) => r.student_id as string)
  const { data: students } = await supabase.from('students').select('id, user_id').in('id', studentIds)
  const userIds = (students ?? []).map((s) => s.user_id as string)
  const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds)
  const nameByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.name]))
  const userByStudent = new Map((students ?? []).map((s) => [s.id, s.user_id]))

  return rows.map((row) => {
    const userId = userByStudent.get(row.student_id as string)
    const name = userId ? nameByUser.get(userId) ?? '—' : '—'
    return {
      id: row.id as string,
      class_group_id: row.class_group_id as string,
      student_id: row.student_id as string,
      joined_at: row.joined_at as string,
      student: { id: row.student_id as string, profile: { name } },
    }
  })
}

export async function addClassGroupMember(classGroupId: string, studentId: string): Promise<void> {
  const { error } = await supabase.rpc('add_class_group_member', {
    p_class_group_id: classGroupId,
    p_student_id: studentId,
  })
  if (error) throw error
}

export async function removeClassGroupMember(classGroupId: string, studentId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_class_group_member', {
    p_class_group_id: classGroupId,
    p_student_id: studentId,
  })
  if (error) throw error
}

export async function importCategoryStudentsToClassGroup(classGroupId: string): Promise<number> {
  const { data, error } = await supabase.rpc('import_category_students_to_class_group', {
    p_class_group_id: classGroupId,
  })
  if (error) throw error
  return (data as number) ?? 0
}

export async function fetchStudentClassGroups(studentId: string): Promise<ClassGroupRow[]> {
  const { data, error } = await supabase
    .from('class_group_members')
    .select(
      `
      class_groups(
        *,
        training_categories(name, color)
      )
    `,
    )
    .eq('student_id', studentId)

  if (error) throw error

  const groups: ClassGroupRow[] = []
  for (const row of data ?? []) {
    const raw = row as Record<string, unknown>
    const group = raw.class_groups as Record<string, unknown> | null
    if (!group) continue
    groups.push({
      ...(group as Omit<ClassGroupRow, 'training_category'>),
      training_category: group.training_categories as ClassGroupRow['training_category'],
    })
  }
  return groups
}

export async function fetchClassGroupMemberStudents(
  classGroupId: string,
): Promise<{ id: string; name: string }[]> {
  const members = await fetchClassGroupMembers(classGroupId)
  return members.map((m) => {
    const profile = m.student?.profile
    const name = Array.isArray(profile) ? profile[0]?.name : profile?.name
    return { id: m.student_id, name: name ?? '—' }
  })
}
