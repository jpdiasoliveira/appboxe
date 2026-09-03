import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { useStudentContext } from '../../contexts/StudentContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import {
  CLASS_GROUP_STATUS_LABELS,
  formatScheduleHint,
  type ClassGroupRow,
} from '../../lib/class-group-types'
import { fetchStudentClassGroups } from '../academy/class-groups-api'

function categoryName(group: ClassGroupRow): string {
  const cat = group.training_category
  if (Array.isArray(cat)) return cat[0]?.name ?? '—'
  return cat?.name ?? '—'
}

export function StudentClassGroupsPage() {
  const { student } = useStudentContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(student?.academy_id ?? null, 'module_class_groups')
  const [groups, setGroups] = useState<ClassGroupRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!student) return
    fetchStudentClassGroups(student.id)
      .then(setGroups)
      .catch((e: Error) => setError(e.message))
  }, [student])

  if (!flagLoading && !enabled) {
    return <Navigate to="/student/dashboard" replace />
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Minhas turmas</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Turmas operacionais em que você está matriculado.
      </p>

      {error ? <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p> : null}

      {groups.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Você ainda não está em nenhuma turma fixa.</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{categoryName(group)}</p>
                  <p className="mt-1 text-sm">{formatScheduleHint(group.schedule_hint)}</p>
                </div>
                <Badge variant={group.status === 'ATIVO' ? 'success' : 'muted'}>
                  {CLASS_GROUP_STATUS_LABELS[group.status]}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
