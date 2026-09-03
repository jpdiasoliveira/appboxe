export interface BeltLevelRow {
  id: string
  academy_id: string
  training_category_id: string
  name: string
  color: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StudentBeltHistoryRow {
  id: string
  academy_id: string
  student_id: string
  training_category_id: string
  belt_level_id: string
  promoted_at: string
  promoted_by: string | null
  notes: string | null
  created_at: string
  belt_level?: BeltLevelRow | BeltLevelRow[] | null
  training_category?: { name: string; color?: string | null } | { name: string; color?: string | null }[] | null
}

export interface StudentCurrentBelt {
  training_category_id: string
  category_name: string
  category_color: string | null
  belt_level_id: string
  belt_name: string
  belt_color: string
  promoted_at: string
}

export const DEFAULT_BELT_COLORS = [
  '#F9FAFB',
  '#FDE047',
  '#F97316',
  '#22C55E',
  '#3B82F6',
  '#A855F7',
  '#854D0E',
  '#1F2937',
]
