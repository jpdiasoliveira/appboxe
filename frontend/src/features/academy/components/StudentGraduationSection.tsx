import { useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { ResponsiveDataList, type DataColumn } from '../../../components/ui/ResponsiveDataList'
import type { StudentBeltHistoryRow } from '../../../lib/belt-types'
import { fetchBeltLevels, fetchStudentBeltHistory, promoteStudentBelt } from '../graduation-api'

interface StudentGraduationSectionProps {
  studentId: string
  categories: { id: string; name: string }[]
  canManage: boolean
}

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

export function StudentGraduationSection({
  studentId,
  categories,
  canManage,
}: StudentGraduationSectionProps) {
  const [history, setHistory] = useState<StudentBeltHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [categoryId, setCategoryId] = useState('')
  const [beltLevelId, setBeltLevelId] = useState('')
  const [promotedAt, setPromotedAt] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [beltOptions, setBeltOptions] = useState<{ id: string; name: string; color: string }[]>([])

  const currentByCategory = useMemo(() => {
    const map = new Map<string, StudentBeltHistoryRow>()
    for (const row of history) {
      if (!map.has(row.training_category_id)) {
        map.set(row.training_category_id, row)
      }
    }
    return map
  }, [history])

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setHistory(await fetchStudentBeltHistory(studentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar graduações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [studentId])

  useEffect(() => {
    if (!categoryId) {
      setBeltOptions([])
      setBeltLevelId('')
      return
    }
    fetchBeltLevels(categoryId)
      .then((rows) =>
        setBeltOptions(rows.map((r) => ({ id: r.id, name: r.name, color: r.color }))),
      )
      .catch((e: Error) => setError(e.message))
  }, [categoryId])

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !categoryId || !beltLevelId) return
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await promoteStudentBelt({
        studentId,
        trainingCategoryId: categoryId,
        beltLevelId,
        promotedAt,
        notes: notes.trim() || undefined,
      })
      setSuccess('Graduação registrada.')
      setNotes('')
      setBeltLevelId('')
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar graduação')
    } finally {
      setBusy(false)
    }
  }

  const columns: DataColumn<StudentBeltHistoryRow>[] = [
    {
      id: 'date',
      header: 'Data',
      primary: true,
      render: (row) => new Date(row.promoted_at).toLocaleDateString('pt-BR'),
    },
    {
      id: 'category',
      header: 'Modalidade',
      render: (row) => categoryName(row),
    },
    {
      id: 'belt',
      header: 'Faixa',
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-6 rounded border border-[var(--color-border)]"
            style={{ backgroundColor: beltColor(row) }}
          />
          {beltName(row)}
        </span>
      ),
    },
    {
      id: 'notes',
      header: 'Obs.',
      render: (row) => row.notes ?? '—',
    },
  ]

  return (
    <div className="space-y-6">
      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const current = currentByCategory.get(cat.id)
            return (
              <Badge key={cat.id} variant="muted">
                {`${cat.name}: ${current ? beltName(current) : 'Sem faixa'}`}
              </Badge>
            )
          })}
        </div>
      ) : null}

      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {success ? <FeedbackMessage variant="success">{success}</FeedbackMessage> : null}

      {canManage ? (
        <form onSubmit={handlePromote} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4">
          <h3 className="mb-4 font-semibold">Registrar promoção</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="promo-category">Modalidade *</Label>
              <Select
                id="promo-category"
                className="mt-1"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="promo-belt">Nova faixa *</Label>
              <Select
                id="promo-belt"
                className="mt-1"
                value={beltLevelId}
                onChange={(e) => setBeltLevelId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {beltOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="promo-date">Data</Label>
              <Input
                id="promo-date"
                type="date"
                className="mt-1"
                value={promotedAt}
                onChange={(e) => setPromotedAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="promo-notes">Observações</Label>
              <Input
                id="promo-notes"
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex.: exame de graduação"
              />
            </div>
          </div>
          <Button type="submit" className="mt-4" disabled={busy || !categoryId || !beltLevelId}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            {busy ? 'Salvando...' : 'Registrar graduação'}
          </Button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando histórico...</p>
      ) : (
        <ResponsiveDataList
          columns={columns}
          rows={history}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma graduação registrada."
        />
      )}
    </div>
  )
}
