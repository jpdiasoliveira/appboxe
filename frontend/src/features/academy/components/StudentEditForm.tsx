import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { CollapsibleSection } from '../../../components/ui/CollapsibleSection'
import { fieldClassName } from '../../../components/ui/field-class'
import { Input } from '../../../components/ui/Input'
import { PhoneInput } from '../../../components/ui/PhoneInput'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import type { PlanPeriod, StudentAttendanceSummaryRow } from '../../../lib/academy-types'
import type { BodyMetricRow } from '../../../lib/body-metrics-types'
import type { StudentStatus } from '../../../lib/types'
import { STUDENT_STATUS_SELECT_OPTIONS } from '../../../lib/student-status'
import type { StudentHistorySummary } from '../academy-api'
import type { StudentEditFields } from '../student-edit-utils'
import { StudentHistoryPanel } from './StudentHistoryPanel'

interface StudentEditFormProps {
  studentId: string
  fields: StudentEditFields
  canEdit: boolean
  saving: boolean
  syncing: boolean
  selectedPlanId: string
  selectedCategoryIds: string[]
  planOptions: { id: string; name: string; price: number; period: PlanPeriod | string }[]
  allCategories: { id: string; name: string; color: string | null }[]
  historySummary: StudentHistorySummary | null
  historyMetrics: BodyMetricRow[]
  historyAttendance: StudentAttendanceSummaryRow[]
  historyLoading: boolean
  onFieldChange: <K extends keyof StudentEditFields>(key: K, value: StudentEditFields[K]) => void
  onPlanChange: (planId: string) => void
  onToggleCategory: (categoryId: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  hideActions?: boolean
  formId?: string
}

export function StudentEditForm({
  studentId,
  fields,
  canEdit,
  saving,
  syncing,
  selectedPlanId,
  selectedCategoryIds,
  planOptions,
  allCategories,
  historySummary,
  historyMetrics,
  historyAttendance,
  historyLoading,
  onFieldChange,
  onPlanChange,
  onToggleCategory,
  onSubmit,
  onClose,
  hideActions = false,
  formId = 'student-edit-form',
}: StudentEditFormProps) {
  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-3">
      {syncing ? (
        <p className="text-xs text-[var(--color-text-muted)]">Atualizando plano e modalidades...</p>
      ) : null}

      <CollapsibleSection title="Dados" description="Nome, contato e status" defaultOpen>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="se-name">Nome</Label>
            <Input
              id="se-name"
              value={fields.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              disabled={!canEdit}
              required
            />
          </div>
          <div>
            <Label htmlFor="se-cpf">CPF</Label>
            <Input
              id="se-cpf"
              value={fields.cpf}
              onChange={(e) => onFieldChange('cpf', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-phone">Telefone</Label>
            <PhoneInput
              id="se-phone"
              value={fields.phone}
              onChange={(value) => onFieldChange('phone', value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-status">Status</Label>
            <Select
              id="se-status"
              value={fields.status}
              onChange={(e) => onFieldChange('status', e.target.value as StudentStatus)}
              disabled={!canEdit}
            >
              {STUDENT_STATUS_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          {fields.status === 'INATIVO' ? (
            <div className="sm:col-span-2">
              <Label htmlFor="se-inactive-reason">Motivo da inativação *</Label>
              <textarea
                id="se-inactive-reason"
                className={`${fieldClassName} mt-1 min-h-20 resize-y`}
                value={fields.inactiveReason}
                onChange={(e) => onFieldChange('inactiveReason', e.target.value)}
                disabled={!canEdit}
                placeholder="Descreva por que o aluno foi inativado"
                required
              />
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Físico" description="Medidas e contato de emergência">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="se-birth">Nascimento</Label>
            <Input
              id="se-birth"
              type="date"
              value={fields.birthDate}
              onChange={(e) => onFieldChange('birthDate', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-weight">Peso (kg)</Label>
            <Input
              id="se-weight"
              type="number"
              step="0.1"
              value={fields.weightKg}
              onChange={(e) => onFieldChange('weightKg', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-height">Altura (cm)</Label>
            <Input
              id="se-height"
              type="number"
              value={fields.heightCm}
              onChange={(e) => onFieldChange('heightCm', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-em-name">Contato emergência</Label>
            <Input
              id="se-em-name"
              value={fields.emergencyName}
              onChange={(e) => onFieldChange('emergencyName', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-em-phone">Tel. emergência</Label>
            <PhoneInput
              id="se-em-phone"
              value={fields.emergencyPhone}
              onChange={(value) => onFieldChange('emergencyPhone', value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Treino e lutas" description="Marcos registrados pela academia">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="se-fights">Lutas oficiais</Label>
            <Input
              id="se-fights"
              type="number"
              min="0"
              value={fields.fightsCount}
              onChange={(e) => onFieldChange('fightsCount', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor="se-sparring">Sessões de sparring</Label>
            <Input
              id="se-sparring"
              type="number"
              min="0"
              value={fields.sparringSessions}
              onChange={(e) => onFieldChange('sparringSessions', e.target.value)}
              disabled={!canEdit}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="se-training-start">Início dos treinos</Label>
            <Input
              id="se-training-start"
              type="date"
              value={fields.trainingStartedAt}
              onChange={(e) => onFieldChange('trainingStartedAt', e.target.value)}
              disabled={!canEdit}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Plano" description="Mensalidade ativa">
        <div>
          <Label htmlFor="se-plan">Plano ativo</Label>
          <Select
            id="se-plan"
            value={selectedPlanId}
            onChange={(e) => onPlanChange(e.target.value)}
            disabled={!canEdit || syncing}
          >
            <option value="">Sem plano</option>
            {planOptions.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} —{' '}
                {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /{' '}
                {String(plan.period).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Modalidades" description="Categorias de treino">
        {allCategories.length > 0 ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto modal-scroll">
            {allCategories.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
              >
                <input
                  type="checkbox"
                  id={`se-cat-${c.id}`}
                  checked={selectedCategoryIds.includes(c.id)}
                  onChange={() => onToggleCategory(c.id)}
                  disabled={!canEdit || syncing}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
                <label htmlFor={`se-cat-${c.id}`} className="flex flex-1 cursor-pointer items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: c.color ?? '#B91C1C' }}
                  />
                  <span className="text-sm">{c.name}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            {syncing ? 'Carregando modalidades...' : 'Nenhuma modalidade cadastrada.'}
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Histórico"
        description="Peso, presenças e evolução"
        defaultOpen
      >
        {historySummary ? (
          <StudentHistoryPanel
            summary={historySummary}
            metrics={historyMetrics}
            recentAttendance={historyAttendance}
            loading={historyLoading}
          />
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">Carregando histórico...</p>
        )}
      </CollapsibleSection>

      {!hideActions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
          <Link
            to={`/academy/alunos/${studentId}`}
            className="text-sm text-[var(--color-primary)] hover:underline"
            onClick={onClose}
          >
            Ver ficha completa →
          </Link>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {canEdit ? (
              <Button type="submit" disabled={saving || syncing}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!canEdit ? (
        <p className="text-xs text-[var(--color-text-muted)]">Somente leitura (assistente).</p>
      ) : null}
    </form>
  )
}
