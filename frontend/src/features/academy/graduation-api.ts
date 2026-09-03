import { supabase } from '../../lib/supabase'
import type { BeltLevelRow, StudentBeltHistoryRow, StudentCurrentBelt } from '../../lib/belt-types'

export async function fetchBeltLevels(trainingCategoryId: string): Promise<BeltLevelRow[]> {
  const { data, error } = await supabase
    .from('belt_levels')
    .select('*')
    .eq('training_category_id', trainingCategoryId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as BeltLevelRow[]
}

export async function upsertBeltLevel(input: {
  academyId: string
  trainingCategoryId: string
  id?: string
  name: string
  color: string
  sortOrder: number
}): Promise<string> {
  const row = {
    academy_id: input.academyId,
    training_category_id: input.trainingCategoryId,
    name: input.name.trim(),
    color: input.color,
    sort_order: input.sortOrder,
  }

  if (input.id) {
    const { error } = await supabase.from('belt_levels').update(row).eq('id', input.id)
    if (error) throw error
    return input.id
  }

  const { data, error } = await supabase.from('belt_levels').insert(row).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function deleteBeltLevel(beltLevelId: string): Promise<void> {
  const { error } = await supabase.from('belt_levels').delete().eq('id', beltLevelId)
  if (error) throw error
}

export async function fetchStudentBeltHistory(studentId: string): Promise<StudentBeltHistoryRow[]> {
  const { data, error } = await supabase
    .from('student_belt_history')
    .select(
      `
      *,
      belt_levels(id, name, color, sort_order),
      training_categories(name, color)
    `,
    )
    .eq('student_id', studentId)
    .order('promoted_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    return {
      ...(row as Omit<StudentBeltHistoryRow, 'belt_level' | 'training_category'>),
      belt_level: raw.belt_levels as StudentBeltHistoryRow['belt_level'],
      training_category: raw.training_categories as StudentBeltHistoryRow['training_category'],
    }
  })
}

export async function promoteStudentBelt(input: {
  studentId: string
  trainingCategoryId: string
  beltLevelId: string
  promotedAt?: string
  notes?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('promote_student_belt', {
    p_student_id: input.studentId,
    p_training_category_id: input.trainingCategoryId,
    p_belt_level_id: input.beltLevelId,
    p_promoted_at: input.promotedAt ?? null,
    p_notes: input.notes ?? null,
  })
  if (error) throw error
  return data as string
}

export async function fetchStudentCurrentBelts(studentId: string): Promise<StudentCurrentBelt[]> {
  const history = await fetchStudentBeltHistory(studentId)
  const latestByCategory = new Map<string, StudentBeltHistoryRow>()

  for (const row of history) {
    if (!latestByCategory.has(row.training_category_id)) {
      latestByCategory.set(row.training_category_id, row)
    }
  }

  return [...latestByCategory.values()].map((row) => {
    const belt = Array.isArray(row.belt_level) ? row.belt_level[0] : row.belt_level
    const cat = Array.isArray(row.training_category) ? row.training_category[0] : row.training_category
    return {
      training_category_id: row.training_category_id,
      category_name: cat?.name ?? '—',
      category_color: cat?.color ?? null,
      belt_level_id: row.belt_level_id,
      belt_name: belt?.name ?? '—',
      belt_color: belt?.color ?? '#E5E7EB',
      promoted_at: row.promoted_at,
    }
  })
}

export async function seedDefaultBeltLevels(input: {
  academyId: string
  trainingCategoryId: string
}): Promise<number> {
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

  const { error } = await supabase.from('belt_levels').upsert(
    defaults.map((d) => ({
      academy_id: input.academyId,
      training_category_id: input.trainingCategoryId,
      ...d,
    })),
    { onConflict: 'training_category_id,name', ignoreDuplicates: true },
  )

  if (error) throw error
  return defaults.length
}
