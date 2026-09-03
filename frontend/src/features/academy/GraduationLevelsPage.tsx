import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { Select } from '../../components/ui/Select'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { DEFAULT_BELT_COLORS, type BeltLevelRow } from '../../lib/belt-types'
import { fetchCategories } from './academy-api'
import {
  deleteBeltLevel,
  fetchBeltLevels,
  seedDefaultBeltLevels,
  upsertBeltLevel,
} from './graduation-api'

export function GraduationLevelsPage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_graduation')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [levels, setLevels] = useState<BeltLevelRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<BeltLevelRow | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_BELT_COLORS[0])
  const [sortOrder, setSortOrder] = useState('1')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId).then(setCategories)
  }, [activeAcademyId])

  useEffect(() => {
    if (!categoryId) {
      setLevels([])
      return
    }
    fetchBeltLevels(categoryId)
      .then(setLevels)
      .catch((e: Error) => setError(e.message))
  }, [categoryId])

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  function openCreate() {
    setEditing(null)
    setName('')
    setColor(DEFAULT_BELT_COLORS[0])
    setSortOrder(String(levels.length + 1))
    setModalOpen(true)
  }

  function openEdit(row: BeltLevelRow) {
    setEditing(row)
    setName(row.name)
    setColor(row.color)
    setSortOrder(String(row.sort_order))
    setModalOpen(true)
  }

  async function saveLevel(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId || !categoryId || !name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await upsertBeltLevel({
        academyId: activeAcademyId,
        trainingCategoryId: categoryId,
        id: editing?.id,
        name,
        color,
        sortOrder: Number(sortOrder) || 1,
      })
      setModalOpen(false)
      setSuccess(editing ? 'Faixa atualizada.' : 'Faixa criada.')
      const rows = await fetchBeltLevels(categoryId)
      setLevels(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar faixa')
    } finally {
      setBusy(false)
    }
  }

  async function removeLevel(id: string) {
    setBusy(true)
    setError(null)
    try {
      await deleteBeltLevel(id)
      setSuccess('Faixa removida.')
      if (categoryId) setLevels(await fetchBeltLevels(categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover faixa')
    } finally {
      setBusy(false)
    }
  }

  async function seedDefaults() {
    if (!activeAcademyId || !categoryId) return
    setBusy(true)
    setError(null)
    try {
      await seedDefaultBeltLevels({ academyId: activeAcademyId, trainingCategoryId: categoryId })
      setSuccess('Faixas padrão criadas.')
      setLevels(await fetchBeltLevels(categoryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar faixas padrão')
    } finally {
      setBusy(false)
    }
  }

  const columns: DataColumn<BeltLevelRow>[] = [
    {
      id: 'order',
      header: '#',
      render: (row) => row.sort_order,
    },
    {
      id: 'name',
      header: 'Faixa',
      primary: true,
      render: (row) => (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-4 w-8 rounded border border-[var(--color-border)]"
            style={{ backgroundColor: row.color }}
          />
          {row.name}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      render: (row) => (
        <RowActionsMenu
          items={[
            { id: 'edit', label: 'Editar', onClick: () => openEdit(row) },
            { id: 'delete', label: 'Excluir', onClick: () => removeLevel(row.id), danger: true },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Graduação / faixas"
        description="Configure as faixas de cada modalidade. Depois registre promoções no perfil do aluno."
      />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}
      {success ? <FeedbackMessage variant="success" className="mb-4">{success}</FeedbackMessage> : null}

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1">
          <Label htmlFor="grad-category">Modalidade</Label>
          <Select
            id="grad-category"
            className="mt-1"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={openCreate} disabled={!categoryId || busy}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Nova faixa
        </Button>
        <Button type="button" variant="ghost" onClick={seedDefaults} disabled={!categoryId || busy}>
          <SparklesIcon className="mr-1.5 h-4 w-4" />
          Faixas padrão
        </Button>
      </div>

      {categoryId ? (
        <ResponsiveDataList
          columns={columns}
          rows={levels}
          rowKey={(row) => row.id}
          emptyMessage="Nenhuma faixa cadastrada para esta modalidade."
        />
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Selecione uma modalidade para começar.</p>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar faixa' : 'Nova faixa'}>
        <form onSubmit={saveLevel} className="space-y-4">
          <div>
            <Label htmlFor="belt-name">Nome *</Label>
            <Input id="belt-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="belt-order">Ordem</Label>
            <Input
              id="belt-order"
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="belt-color">Cor</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEFAULT_BELT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-[var(--color-primary)]' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <input
              id="belt-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="mt-2 h-10 w-14 cursor-pointer rounded border border-[var(--color-border)]"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>
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
