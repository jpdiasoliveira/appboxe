import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FunnelIcon, NoSymbolIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { FilterDrawer } from '../../components/ui/FilterDrawer'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu, type RowActionItem } from '../../components/ui/RowActionsMenu'
import { Select } from '../../components/ui/Select'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { canManageAcademy, isScopedProfessor } from '../../lib/academy-permissions'
import { usePagination } from '../../hooks/usePagination'
import { formatDateBR } from '../../lib/date-utils'
import { formatPhoneDisplay } from '../../lib/phone-utils'
import {
  applyStudentListFilters,
  countActiveStudentFilters,
  EMPTY_STUDENT_LIST_FILTERS,
  type StudentListFilters,
} from '../../lib/student-list-filters'
import { formatStudentStatus, studentStatusVariant, STUDENT_STATUS_SELECT_OPTIONS } from '../../lib/student-status'
import type { StudentListRow } from '../../lib/academy-types'
import {
  fetchActivePlansForAssignment,
  fetchCategories,
  fetchStudentsWithListMeta,
  reactivateStudentByStaff,
} from './academy-api'
import { BatchInactivateStudentsModal } from './components/BatchInactivateStudentsModal'
import { InactivateStudentModal } from './components/InactivateStudentModal'
import { StudentEditModal } from './StudentEditModal'
import { NewStudentModal } from './NewStudentModal'
import { studentDisplayName } from './student-edit-utils'

export function StudentsListPage() {
  const { activeAcademyId, activeRole } = useAcademyContext()
  const isOwner = activeRole ? canManageAcademy([activeRole]) : false
  const scopedProfessor = activeRole ? isScopedProfessor([activeRole]) : false
  const canEdit = activeRole?.role !== 'ASSISTANT'
  const [rows, setRows] = useState<StudentListRow[]>([])
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<StudentListFilters>(EMPTY_STUDENT_LIST_FILTERS)
  const [draftFilters, setDraftFilters] = useState<StudentListFilters>(EMPTY_STUDENT_LIST_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [planOptions, setPlanOptions] = useState<{ id: string; name: string }[]>([])
  const [categoryOptions, setCategoryOptions] = useState<{ id: string; name: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentListRow | null>(null)
  const [inactivatingStudent, setInactivatingStudent] = useState<StudentListRow | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const [showNewStudent, setShowNewStudent] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchInactivateOpen, setBatchInactivateOpen] = useState(false)

  function reload() {
    if (!activeAcademyId) return
    fetchStudentsWithListMeta(activeAcademyId)
      .then((data) => {
        setRows(data)
        setSelectedIds(new Set())
      })
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [activeAcademyId])

  useEffect(() => {
    if (!activeAcademyId) return
    fetchActivePlansForAssignment(activeAcademyId)
      .then((plans) => setPlanOptions(plans.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => setPlanOptions([]))
    fetchCategories(activeAcademyId)
      .then((cats) =>
        setCategoryOptions(
          cats.filter((c) => c.status === 'ATIVO').map((c) => ({ id: c.id, name: c.name })),
        ),
      )
      .catch(() => setCategoryOptions([]))
  }, [activeAcademyId])

  const filtered = useMemo(() => {
    const byFilters = applyStudentListFilters(rows, filters)
    return byFilters.filter((r) =>
      studentDisplayName(r).toLowerCase().includes(search.toLowerCase()),
    )
  }, [rows, filters, search])

  const pagination = usePagination(filtered, {
    resetKey: `${search}-${JSON.stringify(filters)}`,
  })

  const activeFilterCount = countActiveStudentFilters(filters)

  const columns: DataColumn<StudentListRow>[] = [
    {
      id: 'name',
      header: 'Nome',
      primary: true,
      render: (row) => (
        <button
          type="button"
          className={`font-medium text-[var(--color-primary)] hover:underline ${
            row.status === 'INADIMPLENTE' ? 'border-l-2 border-[var(--color-danger)] pl-2' : ''
          }`}
          onClick={() => setEditingStudent(row)}
        >
          {studentDisplayName(row)}
        </button>
      ),
    },
    {
      id: 'phone',
      header: 'Telefone',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => formatPhoneDisplay(row.phone),
    },
    {
      id: 'plan',
      header: 'Plano',
      hideOnMobile: true,
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.plan_name ?? '—',
    },
    {
      id: 'enrollment',
      header: 'Matrícula',
      cellClassName: 'text-[var(--color-text-muted)]',
      hideOnMobile: true,
      render: (row) => formatDateBR(row.enrollment_date),
    },
    {
      id: 'status',
      header: 'Status',
      headerClassName: 'min-w-[8.5rem]',
      render: (row) => (
        <Badge variant={studentStatusVariant(row.status)}>{formatStudentStatus(row.status)}</Badge>
      ),
    },
  ]

  function renderActions(row: StudentListRow) {
    const items: RowActionItem[] = [
      {
        id: 'edit',
        label: 'Editar',
        icon: PencilSquareIcon,
        onClick: () => setEditingStudent(row),
      },
    ]

    if (canEdit && row.status !== 'INATIVO') {
      items.push({
        id: 'inactivate',
        label: 'Inativar',
        icon: NoSymbolIcon,
        danger: true,
        onClick: () => setInactivatingStudent(row),
      })
    }

    if (canEdit && row.status === 'INATIVO') {
      items.push({
        id: 'reactivate',
        label: reactivatingId === row.id ? 'Reativando...' : 'Reativar',
        disabled: reactivatingId === row.id,
        onClick: () => void handleReactivate(row),
      })
    }

    return (
      <RowActionsMenu
        ariaLabel={`Ações de ${studentDisplayName(row)}`}
        items={items}
      />
    )
  }

  async function handleReactivate(row: StudentListRow) {
    setReactivatingId(row.id)
    setError(null)
    try {
      await reactivateStudentByStaff(row.id)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reativar aluno')
    } finally {
      setReactivatingId(null)
    }
  }

  function openFilters() {
    setDraftFilters(filters)
    setFilterOpen(true)
  }

  function applyFilters() {
    setFilters(draftFilters)
    setFilterOpen(false)
  }

  function clearFilters() {
    setDraftFilters(EMPTY_STUDENT_LIST_FILTERS)
    setFilters(EMPTY_STUDENT_LIST_FILTERS)
    setFilterOpen(false)
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllSelection(keys: string[], checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })
  }

  const selectedCount = selectedIds.size

  return (
    <div>
      <PageHeader
        title="Alunos"
        actions={
          <>
            {isOwner ? (
              <Link to="/academy/alunos/convites" className="w-full sm:w-auto">
                <Button variant="ghost" className="w-full sm:w-auto">
                  Convites pendentes
                </Button>
              </Link>
            ) : null}
            <Button type="button" className="w-full sm:w-auto" onClick={() => setShowNewStudent(true)}>
              Novo aluno
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={openFilters}>
          <FunnelIcon className="mr-2 h-4 w-4" aria-hidden />
          Filtros
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Button>
      </div>

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}

      {isOwner && selectedCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3">
          <span className="text-sm text-[var(--color-text-muted)]">
            {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}
          </span>
          <Button type="button" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Limpar seleção
          </Button>
          <Button type="button" onClick={() => setBatchInactivateOpen(true)}>
            Marcar inativo
          </Button>
        </div>
      ) : null}

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        selection={
          isOwner
            ? {
                selectedKeys: selectedIds,
                onToggle: toggleSelection,
                onToggleAll: toggleAllSelection,
                isRowSelectable: (row) => row.status !== 'INATIVO',
              }
            : undefined
        }
        emptyMessage={
          scopedProfessor
            ? 'Nenhum aluno nas suas modalidades. Peça ao dono para vincular você a uma categoria.'
            : 'Nenhum aluno encontrado.'
        }
        renderActions={renderActions}
        footer={
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            from={pagination.from}
            to={pagination.to}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        }
      />

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onClear={clearFilters}
        onApply={applyFilters}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="filter-status">Status</Label>
            <Select
              id="filter-status"
              className="mt-1"
              value={draftFilters.status}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  status: e.target.value as StudentListFilters['status'],
                }))
              }
            >
              <option value="TODOS">Todos</option>
              {STUDENT_STATUS_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-plan">Plano</Label>
            <Select
              id="filter-plan"
              className="mt-1"
              value={draftFilters.planId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, planId: e.target.value }))}
            >
              <option value="">Todos</option>
              {planOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-category">Modalidade</Label>
            <Select
              id="filter-category"
              className="mt-1"
              value={draftFilters.categoryId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Todas</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={draftFilters.onlyInadimplente}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, onlyInadimplente: e.target.checked }))
              }
            />
            <span className="text-sm">Somente inadimplentes</span>
          </label>
        </div>
      </FilterDrawer>

      <StudentEditModal
        open={editingStudent != null}
        studentId={editingStudent?.id ?? null}
        initialRow={editingStudent}
        academyId={activeAcademyId}
        canEdit={canEdit}
        onClose={() => setEditingStudent(null)}
        onSaved={reload}
      />

      <NewStudentModal
        open={showNewStudent}
        onClose={() => setShowNewStudent(false)}
        onCreated={reload}
      />

      <InactivateStudentModal
        open={inactivatingStudent != null}
        student={inactivatingStudent}
        onClose={() => setInactivatingStudent(null)}
        onInactivated={reload}
      />

      <BatchInactivateStudentsModal
        open={batchInactivateOpen}
        studentIds={[...selectedIds]}
        onClose={() => setBatchInactivateOpen(false)}
        onInactivated={reload}
      />
    </div>
  )
}
