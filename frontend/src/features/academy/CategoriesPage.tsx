import { useEffect, useState } from 'react'
import { CategoryCard, type CategorySaveInput } from '../../components/CategoryCard'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { canCreateTrainingCategory, canEditTrainingCategory, canManageAcademy, isScopedProfessor } from '../../lib/academy-permissions'
import { canAccessFinanceiro } from '../../lib/auth-utils'
import type { CategoryOverviewRow, InstructorRow } from '../../lib/academy-types'
import {
  assignCategoryInstructor,
  fetchCategoryOverview,
  fetchInstructors,
  removeCategoryInstructor,
  upsertCategory,
} from './academy-api'

export function CategoriesPage() {
  const { activeAcademyId, activeRole } = useAcademyContext()
  const [rows, setRows] = useState<CategoryOverviewRow[]>([])
  const [staff, setStaff] = useState<InstructorRow[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#B91C1C')
  const [error, setError] = useState<string | null>(null)
  const [assigningCategoryId, setAssigningCategoryId] = useState<string | null>(null)
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null)
  const [selectedByCategory, setSelectedByCategory] = useState<Record<string, string>>({})

  const showFinance = activeRole ? canAccessFinanceiro([activeRole]) : false
  const canManage = activeRole ? canManageAcademy([activeRole]) : false
  const canCreate = activeRole ? canCreateTrainingCategory([activeRole]) : false
  const canEdit = activeRole ? canEditTrainingCategory([activeRole]) : false
  const isProfessor = activeRole ? isScopedProfessor([activeRole]) : false

  function emptyStateMessage(): string {
    if (canCreate) {
      return isProfessor
        ? 'Nenhuma turma sua ainda. Crie a primeira acima (ex.: Boxe Kids, Feminino).'
        : 'Nenhuma categoria cadastrada. Adicione a primeira acima.'
    }
    return 'Nenhuma categoria cadastrada na academia.'
  }

  function reload() {
    if (!activeAcademyId) return
    Promise.all([fetchCategoryOverview(activeAcademyId), fetchInstructors(activeAcademyId)])
      .then(([categories, instructors]) => {
        setRows(categories)
        setStaff(instructors)
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [activeAcademyId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId || !name.trim()) return
    try {
      await upsertCategory(activeAcademyId, { name: name.trim(), color })
      setName('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }

  async function handleSave(categoryId: string, input: CategorySaveInput) {
    if (!activeAcademyId) return
    setSavingCategoryId(categoryId)
    setError(null)
    try {
      await upsertCategory(activeAcademyId, {
        id: categoryId,
        name: input.name.trim(),
        description: input.description.trim() || null,
        color: input.color,
        status: input.status,
        max_capacity: input.max_capacity,
        schedule_label: input.schedule_label,
        image_url: input.image_url,
      })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSavingCategoryId(null)
    }
  }

  async function handleAssign(categoryId: string) {
    if (!activeAcademyId) return
    const userId = selectedByCategory[categoryId]
    if (!userId) return
    setAssigningCategoryId(categoryId)
    setError(null)
    try {
      await assignCategoryInstructor(activeAcademyId, categoryId, userId)
      setSelectedByCategory((prev) => ({ ...prev, [categoryId]: '' }))
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao vincular professor')
    } finally {
      setAssigningCategoryId(null)
    }
  }

  async function handleRemove(categoryId: string, userId: string) {
    setError(null)
    try {
      await removeCategoryInstructor(categoryId, userId)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover professor')
    }
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Categorias / Modalidades</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        {canManage
          ? 'Gerencie modalidades, vagas, horários, foto na landing, professores e métricas. Inativas somem do site, mas mantêm histórico.'
          : isProfessor
            ? 'Crie e edite suas turmas (ex.: Kids, Feminino). O dono vê todas e pode vincular outros professores.'
            : 'Modalidades da academia conforme seu perfil.'}
      </p>

      {canCreate ? (
        <form onSubmit={handleAdd} className="mb-6 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="cat-name">{isProfessor ? 'Nova turma' : 'Nova categoria'}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isProfessor ? 'Ex: Boxe Kids' : 'Ex: Boxe'}
            />
          </div>
          <div>
            <Label htmlFor="cat-color">Cor</Label>
            <Input
              id="cat-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer p-1"
            />
          </div>
          <Button type="submit">Adicionar</Button>
        </form>
      ) : null}

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            academyId={activeAcademyId ?? ''}
            staff={staff}
            canManage={canManage}
            canEdit={canEdit}
            showFinance={showFinance}
            assigning={assigningCategoryId === category.id}
            saving={savingCategoryId === category.id}
            selectedInstructorId={selectedByCategory[category.id] ?? ''}
            onSelectInstructor={(userId) =>
              setSelectedByCategory((prev) => ({ ...prev, [category.id]: userId }))
            }
            onAssignInstructor={() => void handleAssign(category.id)}
            onRemoveInstructor={(userId) => void handleRemove(category.id, userId)}
            onSave={(input) => void handleSave(category.id, input)}
          />
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{emptyStateMessage()}</p>
        ) : null}
      </div>
    </div>
  )
}
