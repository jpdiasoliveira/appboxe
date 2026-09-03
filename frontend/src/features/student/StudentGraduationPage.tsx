import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useStudentContext } from '../../contexts/StudentContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import type { StudentBeltHistoryRow } from '../../lib/belt-types'
import { fetchStudentBeltHistory } from '../academy/graduation-api'

function beltName(row: StudentBeltHistoryRow): string {
  const belt = row.belt_level
  if (Array.isArray(belt)) return belt[0]?.name ?? '—'
  return belt?.name ?? '—'
}

function beltColor(row: StudentBeltHistoryRow): string {
  const belt = row.belt_level
  if (Array.isArray(belt)) return belt[0]?.color ?? '#E5E7EB'
  return belt?.color ?? '#E5E7EB'
}

function categoryName(row: StudentBeltHistoryRow): string {
  const cat = row.training_category
  if (Array.isArray(cat)) return cat[0]?.name ?? '—'
  return cat?.name ?? '—'
}

export function StudentGraduationPage() {
  const { student } = useStudentContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(student?.academy_id ?? null, 'module_graduation')
  const [history, setHistory] = useState<StudentBeltHistoryRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!student) return
    fetchStudentBeltHistory(student.id)
      .then(setHistory)
      .catch((e: Error) => setError(e.message))
  }, [student])

  if (!flagLoading && !enabled) {
    return <Navigate to="/student/dashboard" replace />
  }

  const latestByCategory = new Map<string, StudentBeltHistoryRow>()
  for (const row of history) {
    if (!latestByCategory.has(row.training_category_id)) {
      latestByCategory.set(row.training_category_id, row)
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Minhas faixas</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Graduações registradas pela academia em cada modalidade.
      </p>

      {error ? <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p> : null}

      {latestByCategory.size === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">Nenhuma graduação registrada ainda.</p>
      ) : (
        <ul className="mb-8 space-y-3">
          {[...latestByCategory.values()].map((row) => (
            <li
              key={row.training_category_id}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4"
            >
              <div>
                <p className="font-medium">{categoryName(row)}</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Desde {new Date(row.promoted_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-10 rounded border border-[var(--color-border)]"
                  style={{ backgroundColor: beltColor(row) }}
                />
                <span className="font-semibold">{beltName(row)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {history.length > 0 ? (
        <>
          <h3 className="mb-3 font-semibold">Histórico</h3>
          <ul className="space-y-2 text-sm">
            {history.map((row) => (
              <li key={row.id} className="rounded-lg border border-[var(--color-border)] px-3 py-2">
                {new Date(row.promoted_at).toLocaleDateString('pt-BR')} — {categoryName(row)} → {beltName(row)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
