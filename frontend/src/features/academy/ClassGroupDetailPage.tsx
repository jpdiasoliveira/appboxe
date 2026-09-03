import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import {
  CLASS_GROUP_STATUS_LABELS,
  formatScheduleHint,
  type ClassGroupMemberRow,
  type ClassGroupRow,
  type ClassGroupStatus,
} from '../../lib/class-group-types'
import { fetchStudents } from './academy-api'
import {
  addClassGroupMember,
  fetchClassGroup,
  fetchClassGroupMembers,
  importCategoryStudentsToClassGroup,
  removeClassGroupMember,
  upsertClassGroup,
} from './class-groups-api'

function memberName(member: ClassGroupMemberRow): string {
  const profile = member.student?.profile
  if (Array.isArray(profile)) return profile[0]?.name ?? '—'
  return profile?.name ?? '—'
}

function categoryName(group: ClassGroupRow): string {
  const cat = group.training_category
  if (Array.isArray(cat)) return cat[0]?.name ?? '—'
  return cat?.name ?? '—'
}

function scheduleDaysFromHint(hint: Record<string, unknown> | null | undefined): string[] {
  return Array.isArray(hint?.days) ? (hint.days as string[]) : []
}

function scheduleTimeFromHint(hint: Record<string, unknown> | null | undefined): string {
  return typeof hint?.time === 'string' ? hint.time : '18:00'
}

const SCHEDULE_DAY_OPTIONS = [
  ['MON', 'Seg'],
  ['WED', 'Qua'],
  ['FRI', 'Sex'],
  ['TUE', 'Ter'],
  ['THU', 'Qui'],
  ['SAT', 'Sáb'],
] as const

export function ClassGroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const [group, setGroup] = useState<ClassGroupRow | null>(null)
  const [members, setMembers] = useState<ClassGroupMemberRow[]>([])
  const [availableStudents, setAvailableStudents] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [editName, setEditName] = useState('')
  const [editMaxStudents, setEditMaxStudents] = useState('20')
  const [editScheduleDays, setEditScheduleDays] = useState<string[]>(['MON', 'WED'])
  const [editScheduleTime, setEditScheduleTime] = useState('18:00')
  const [editStatus, setEditStatus] = useState<ClassGroupStatus>('ATIVO')

  const memberIds = useMemo(() => new Set(members.map((m) => m.student_id)), [members])

  function reload() {
    if (!groupId) return
    Promise.all([fetchClassGroup(groupId), fetchClassGroupMembers(groupId)])
      .then(([g, m]) => {
        setGroup(g)
        setMembers(m)
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [groupId])

  useEffect(() => {
    if (!activeAcademyId || !group) return
    fetchStudents(activeAcademyId, ['ATIVO', 'TRIAL', 'INADIMPLENTE']).then((rows) =>
      setAvailableStudents(
        rows
          .filter((s) => !memberIds.has(s.id))
          .map((s) => ({
            id: s.id,
            name: Array.isArray(s.profile) ? s.profile[0]?.name ?? '—' : s.profile?.name ?? '—',
          })),
      ),
    )
  }, [activeAcademyId, group, memberIds])

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!groupId || !selectedStudentId) return
    setBusy(true)
    setError(null)
    try {
      await addClassGroupMember(groupId, selectedStudentId)
      setAddModalOpen(false)
      setSelectedStudentId('')
      setSuccess('Aluno adicionado à turma.')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar aluno')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove(studentId: string) {
    if (!groupId) return
    setBusy(true)
    setError(null)
    try {
      await removeClassGroupMember(groupId, studentId)
      setSuccess('Aluno removido da turma.')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover aluno')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport() {
    if (!groupId) return
    setBusy(true)
    setError(null)
    try {
      const added = await importCategoryStudentsToClassGroup(groupId)
      setSuccess(`${added} aluno(s) importado(s) da modalidade.`)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar alunos')
    } finally {
      setBusy(false)
    }
  }

  function openEditModal() {
    if (!group) return
    setEditName(group.name)
    setEditMaxStudents(String(group.max_students))
    setEditScheduleDays(scheduleDaysFromHint(group.schedule_hint))
    setEditScheduleTime(scheduleTimeFromHint(group.schedule_hint))
    setEditStatus(group.status)
    setEditModalOpen(true)
  }

  function toggleEditDay(day: string) {
    setEditScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleEditGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!group || !activeAcademyId || !editName.trim()) return
    setBusy(true)
    setError(null)
    try {
      await upsertClassGroup({
        id: group.id,
        academyId: activeAcademyId,
        trainingCategoryId: group.training_category_id,
        name: editName.trim(),
        maxStudents: Number(editMaxStudents) || 20,
        scheduleHint: { days: editScheduleDays, time: editScheduleTime },
        status: editStatus,
      })
      setEditModalOpen(false)
      setSuccess('Turma atualizada.')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar turma')
    } finally {
      setBusy(false)
    }
  }

  const columns: DataColumn<ClassGroupMemberRow>[] = [
    {
      id: 'name',
      header: 'Aluno',
      primary: true,
      render: (row) => (
        <Link to={`/academy/alunos/${row.student_id}`} className="text-[var(--color-primary)] hover:underline">
          {memberName(row)}
        </Link>
      ),
    },
    {
      id: 'joined',
      header: 'Desde',
      render: (row) => new Date(row.joined_at).toLocaleDateString('pt-BR'),
    },
    {
      id: 'actions',
      header: '',
      render: (row) => (
        <RowActionsMenu
          items={[
            {
              id: 'remove',
              label: 'Remover da turma',
              onClick: () => handleRemove(row.student_id),
              danger: true,
            },
          ]}
        />
      ),
    },
  ]

  if (!group) {
    return <p className="text-sm text-[var(--color-text-muted)]">Carregando turma...</p>
  }

  return (
    <div>
      <Link
        to="/academy/turmas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Voltar para turmas
      </Link>

      <PageHeader
        title={group.name}
        description={`${categoryName(group)} · ${formatScheduleHint(group.schedule_hint)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={openEditModal} disabled={busy}>
              Editar turma
            </Button>
            <Button type="button" variant="ghost" onClick={handleImport} disabled={busy}>
              Importar da modalidade
            </Button>
            <Button type="button" onClick={() => setAddModalOpen(true)} disabled={busy}>
              <UserPlusIcon className="mr-1.5 h-4 w-4" />
              Adicionar aluno
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={group.status === 'ATIVO' ? 'success' : 'muted'}>
          {CLASS_GROUP_STATUS_LABELS[group.status]}
        </Badge>
        <Badge variant="muted">
          {`${group.member_count ?? members.length}/${group.max_students} alunos`}
        </Badge>
      </div>

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}
      {success ? <FeedbackMessage variant="success" className="mb-4">{success}</FeedbackMessage> : null}

      <ResponsiveDataList
        columns={columns}
        rows={members}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum aluno no roster."
      />

      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Adicionar aluno">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <Label htmlFor="student-select">Aluno</Label>
            <select
              id="student-select"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? 'Salvando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar turma">
        <form onSubmit={handleEditGroup} className="space-y-4">
          <div>
            <Label htmlFor="edit-group-name">Nome *</Label>
            <Input
              id="edit-group-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-group-max">Capacidade máxima</Label>
            <Input
              id="edit-group-max"
              type="number"
              min={1}
              value={editMaxStudents}
              onChange={(e) => setEditMaxStudents(e.target.value)}
            />
          </div>
          <div>
            <Label>Horário (exibição)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SCHEDULE_DAY_OPTIONS.map(([value, label]) => (
                <label key={value} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={editScheduleDays.includes(value)}
                    onChange={() => toggleEditDay(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Input
              className="mt-2"
              type="time"
              value={editScheduleTime}
              onChange={(e) => setEditScheduleTime(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-group-status">Status</Label>
            <select
              id="edit-group-status"
              className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3 py-2 text-sm"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as ClassGroupStatus)}
            >
              {Object.entries(CLASS_GROUP_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            Modalidade: {categoryName(group)} (não editável aqui).
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
