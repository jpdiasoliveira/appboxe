import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UserGroupIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  XMarkIcon,
  ClockIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChevronDownIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ImageUploadField } from './ImageUploadField'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import type { CategoryOverviewRow, InstructorRow } from '../lib/academy-types'
import { formatStudentStatus, studentStatusVariant } from '../lib/student-status'

export interface CategorySaveInput {
  name: string
  description: string
  color: string
  status: string
  max_capacity: number | null
  schedule_label: string
  image_url: string
}

interface CategoryCardProps {
  category: CategoryOverviewRow
  academyId: string
  staff: InstructorRow[]
  canManage: boolean
  canEdit: boolean
  showFinance: boolean
  assigning: boolean
  saving: boolean
  selectedInstructorId: string
  onSelectInstructor: (userId: string) => void
  onAssignInstructor: () => void
  onRemoveInstructor: (userId: string) => void
  onSave: (input: CategorySaveInput) => void
}

function staffName(row: InstructorRow): string {
  const profile = row.profile
  if (!profile) return '—'
  if (Array.isArray(profile)) return profile[0]?.name ?? '—'
  return profile.name
}

export function CategoryCard({
  category,
  academyId,
  staff,
  canManage,
  canEdit,
  showFinance,
  assigning,
  saving,
  selectedInstructorId,
  onSelectInstructor,
  onAssignInstructor,
  onRemoveInstructor,
  onSave,
}: CategoryCardProps) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<CategorySaveInput>({
    name: category.name,
    description: category.description ?? '',
    color: category.color ?? '#B91C1C',
    status: category.status,
    max_capacity: category.max_capacity,
    schedule_label: category.schedule_label ?? '',
    image_url: category.image_url ?? '',
  })

  const assignedIds = new Set(category.instructors.map((i) => i.user_id))
  const availableStaff = staff.filter((s) => !assignedIds.has(s.user_id))
  const capacityLabel =
    category.max_capacity != null
      ? `${category.student_count}/${category.max_capacity} vagas`
      : `${category.student_count} aluno${category.student_count === 1 ? '' : 's'}`

  const isFull =
    category.max_capacity != null && category.student_count >= category.max_capacity

  function startEdit() {
    setForm({
      name: category.name,
      description: category.description ?? '',
      color: category.color ?? '#B91C1C',
      status: category.status,
      max_capacity: category.max_capacity,
      schedule_label: category.schedule_label ?? '',
      image_url: category.image_url ?? '',
    })
    setEditing(true)
  }

  function handleSave() {
    onSave(form)
    setEditing(false)
  }

  return (
    <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor={`cat-name-${category.id}`}>Nome</Label>
              <Input
                id={`cat-name-${category.id}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor={`cat-desc-${category.id}`}>Descrição (landing)</Label>
              <Input
                id={`cat-desc-${category.id}`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Texto público na landing"
              />
            </div>
            <div>
              <Label htmlFor={`cat-color-${category.id}`}>Cor</Label>
              <Input
                id={`cat-color-${category.id}`}
                type="color"
                value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                className="h-10 w-14 cursor-pointer p-1"
              />
            </div>
            <div>
              <Label htmlFor={`cat-status-${category.id}`}>Status</Label>
              <select
                id={`cat-status-${category.id}`}
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`cat-cap-${category.id}`}>Capacidade máxima</Label>
              <Input
                id={`cat-cap-${category.id}`}
                type="number"
                min="1"
                placeholder="Sem limite"
                value={form.max_capacity ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    max_capacity: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor={`cat-schedule-${category.id}`}>Horário fixo</Label>
              <Input
                id={`cat-schedule-${category.id}`}
                value={form.schedule_label}
                onChange={(e) => setForm((f) => ({ ...f, schedule_label: e.target.value }))}
                placeholder="Ex: Seg/Qua 19h"
              />
            </div>
            {canManage ? (
              <div className="sm:col-span-2">
                <ImageUploadField
                  label="Foto na landing (opcional)"
                  hint="Aparece na seção Modalidades do site público. Se vazio, mostra só a cor."
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  academyId={academyId}
                  uploadKind="landing"
                  landingPurpose={`category-${category.id}`}
                  aspect="video"
                />
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <>
          {category.image_url?.trim() ? (
            <div className="-mx-4 -mt-4 mb-4 overflow-hidden rounded-t-xl border-b border-[var(--color-border)]">
              <img
                src={category.image_url.trim()}
                alt=""
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: category.color ?? '#B91C1C' }}
              />
              <div>
                <h3 className="font-semibold">{category.name}</h3>
                {category.description ? (
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{category.description}</p>
                ) : null}
                {category.schedule_label ? (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {category.schedule_label}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={category.status === 'ATIVO' ? 'success' : 'muted'}>
                {category.status}
              </Badge>
              {isFull ? <Badge variant="warning">Lotada</Badge> : null}
              {canEdit ? (
                <Button type="button" variant="ghost" onClick={startEdit}>
                  <PencilSquareIcon className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <UserGroupIcon className="h-4 w-4" />
              {capacityLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDaysIcon className="h-4 w-4" />
              {category.sessions_this_week} aula{category.sessions_this_week === 1 ? '' : 's'} esta semana
            </span>
            {category.attendance_rate_pct != null ? (
              <span className="inline-flex items-center gap-1.5">
                <ChartBarIcon className="h-4 w-4" />
                {category.attendance_rate_pct}% presença no mês
              </span>
            ) : null}
            {showFinance && category.revenue_month != null ? (
              <span className="inline-flex items-center gap-1.5">
                <BanknotesIcon className="h-4 w-4" />
                {Number(category.revenue_month).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                  maximumFractionDigits: 0,
                })}{' '}
                receita no mês
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <AcademicCapIcon className="h-4 w-4" />
              {category.instructors.length} professor{category.instructors.length === 1 ? '' : 'es'}
            </span>
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
              Professores
            </p>
            {category.instructors.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {category.instructors.map((instructor) => (
                  <span
                    key={instructor.user_id}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-1 text-xs"
                  >
                    {instructor.name}
                    {canManage ? (
                      <button
                        type="button"
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"
                        aria-label={`Remover ${instructor.name}`}
                        onClick={() => onRemoveInstructor(instructor.user_id)}
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mb-3 text-sm text-[var(--color-text-muted)]">Nenhum professor vinculado.</p>
            )}

            {canManage ? (
              availableStaff.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="min-w-[12rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                    value={selectedInstructorId}
                    onChange={(e) => onSelectInstructor(e.target.value)}
                  >
                    <option value="">Selecionar professor…</option>
                    {availableStaff.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {staffName(member)}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={!selectedInstructorId || assigning}
                    onClick={onAssignInstructor}
                  >
                    {assigning ? 'Salvando…' : 'Adicionar'}
                  </Button>
                </div>
              ) : staff.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Convide a equipe em{' '}
                  <Link to="/academy/professores" className="text-[var(--color-primary)] hover:underline">
                    Professores
                  </Link>
                  .
                </p>
              ) : (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Todos os professores já estão vinculados.
                </p>
              )
            ) : null}
          </div>

          <div className="mt-4 border-t border-[var(--color-border)] pt-3">
            <button
              type="button"
              className="flex w-full items-center justify-between text-sm font-medium text-[var(--color-text)]"
              onClick={() => setExpanded((v) => !v)}
            >
              <span>Alunos nesta modalidade ({category.students.length})</span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {expanded ? (
              <ul className="mt-3 space-y-2">
                {category.students.length === 0 ? (
                  <li className="text-sm text-[var(--color-text-muted)]">Nenhum aluno matriculado.</li>
                ) : (
                  category.students.map((student) => (
                    <li
                      key={student.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                    >
                      <Link
                        to={`/academy/alunos/${student.id}`}
                        className="hover:text-[var(--color-primary)] hover:underline"
                      >
                        {student.name}
                      </Link>
                      <Badge variant={studentStatusVariant(student.status)}>
                        {formatStudentStatus(student.status)}
                      </Badge>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        </>
      )}
    </article>
  )
}
