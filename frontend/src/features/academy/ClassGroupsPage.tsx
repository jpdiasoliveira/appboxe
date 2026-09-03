import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import {
  CLASS_GROUP_STATUS_LABELS,
  formatScheduleHint,
  type ClassGroupRow,
} from '../../lib/class-group-types'
import { fetchCategories } from './academy-api'
import { fetchClassGroups, upsertClassGroup } from './class-groups-api'

function categoryName(group: ClassGroupRow): string {
  const cat = group.training_category
  if (Array.isArray(cat)) return cat[0]?.name ?? '—'
  return cat?.name ?? '—'
}

export function ClassGroupsPage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const [groups, setGroups] = useState<ClassGroupRow[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [maxStudents, setMaxStudents] = useState('20')
  const [scheduleDays, setScheduleDays] = useState<string[]>(['MON', 'WED'])
  const [scheduleTime, setScheduleTime] = useState('18:00')
  const [saving, setSaving] = useState(false)

  function reload() {
    if (!activeAcademyId) return
    fetchClassGroups(activeAcademyId)
      .then(setGroups)
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    if (!activeAcademyId) return
    reload()
    fetchCategories(activeAcademyId).then((rows) =>
      setCategories(rows.map((c) => ({ id: c.id, name: c.name }))),
    )
  }, [activeAcademyId])

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId || !name.trim() || !categoryId) return
    setSaving(true)
    setError(null)
    try {
      await upsertClassGroup({
        academyId: activeAcademyId,
        trainingCategoryId: categoryId,
        name: name.trim(),
        maxStudents: Number(maxStudents) || 20,
        scheduleHint: { days: scheduleDays, time: scheduleTime },
      })
      setModalOpen(false)
      setName('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar turma')
    } finally {
      setSaving(false)
    }
  }

  function toggleDay(day: string) {
    setScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  const columns: DataColumn<ClassGroupRow>[] = [
    {
      id: 'name',
      header: 'Turma',
      primary: true,
      render: (row) => (
        <Link to={`/academy/turmas/${row.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
          {row.name}
        </Link>
      ),
    },
    {
      id: 'category',
      header: 'Modalidade',
      render: (row) => categoryName(row),
    },
    {
      id: 'schedule',
      header: 'Horário',
      render: (row) => formatScheduleHint(row.schedule_hint),
    },
    {
      id: 'roster',
      header: 'Alunos',
      render: (row) => `${row.member_count ?? 0}/${row.max_students}`,
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'ATIVO' ? 'success' : 'muted'}>
          {CLASS_GROUP_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Turmas"
        description="Turmas operacionais com roster fixo dentro de cada modalidade."
        actions={
          <Button type="button" onClick={() => setModalOpen(true)}>
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Nova turma
          </Button>
        }
      />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      <ResponsiveDataList
        columns={columns}
        rows={groups}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma turma cadastrada."
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova turma">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="group-name">Nome *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Boxe Kids — Seg/Qua 18h"
              required
            />
          </div>
          <div>
            <Label htmlFor="group-category">Modalidade *</Label>
            <select
              id="group-category"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
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
            </select>
          </div>
          <div>
            <Label htmlFor="group-max">Capacidade máxima</Label>
            <Input
              id="group-max"
              type="number"
              min={1}
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
            />
          </div>
          <div>
            <Label>Horário (exibição)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                ['MON', 'Seg'],
                ['WED', 'Qua'],
                ['FRI', 'Sex'],
                ['TUE', 'Ter'],
                ['THU', 'Qui'],
                ['SAT', 'Sáb'],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={scheduleDays.includes(value)}
                    onChange={() => toggleDay(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Input
              className="mt-2"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar turma'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
