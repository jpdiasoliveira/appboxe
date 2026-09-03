import { useEffect, useState } from 'react'
import { LinkIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/Button'
import { CollapsibleSection } from '../../../components/ui/CollapsibleSection'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { PhoneInput } from '../../../components/ui/PhoneInput'
import { Label } from '../../../components/ui/Label'
import { useAcademyContext } from '../../../contexts/AcademyContext'
import { useAuth } from '../../../contexts/AuthContext'
import { canCreateStudentInvite, isScopedProfessor } from '../../../lib/academy-permissions'
import { parseAcademySettings } from '../../../lib/academy-settings'
import { buildStudentInviteWhatsAppMessage, openWhatsAppInvite } from '../../../lib/invite-utils'
import { formatStudentStatus } from '../../../lib/student-status'
import type { EnrollmentStatus } from '../../../lib/trial-policy'
import { createStudentInvite, inviteEmailStatusLabel, inviteUrl } from '../../invite/invite-api'
import { createStudent, fetchAcademySettings, fetchCategories, updateStudentCategoriesByStaff } from '../academy-api'
import { EMPTY_STUDENT_EDIT_FIELDS, type StudentEditFields } from '../student-edit-utils'

interface NewStudentFormProps {
  onSuccess: () => void
  onCancel?: () => void
  showCancel?: boolean
  hideActions?: boolean
  formId?: string
  onLoadingChange?: (loading: boolean) => void
}

export function NewStudentForm({
  onSuccess,
  onCancel,
  showCancel = false,
  hideActions = false,
  formId = 'new-student-form',
  onLoadingChange,
}: NewStudentFormProps) {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const [email, setEmail] = useState('')
  const [fields, setFields] = useState<StudentEditFields>(EMPTY_STUDENT_EDIT_FIELDS)
  const [formError, setFormError] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  const activeAcademyName =
    roles.find((r) => r.academy_id === activeAcademyId)?.academy?.name ?? undefined
  const academyRoles = roles.filter((r) => r.academy_id === activeAcademyId && r.status === 'ATIVO')
  const canInviteStudent = canCreateStudentInvite(academyRoles)
  const scopedProfessor = isScopedProfessor(academyRoles)

  const [categoryOptions, setCategoryOptions] = useState<
    { id: string; name: string; color: string | null }[]
  >([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [trialMode, setTrialMode] = useState<'OFF' | 'DAYS' | 'FREE_CLASS' | 'MANUAL'>('OFF')
  const [manualEnrollmentStatus, setManualEnrollmentStatus] = useState<EnrollmentStatus>('ATIVO')

  function updateField<K extends keyof StudentEditFields>(key: K, value: StudentEditFields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  function resetForm() {
    setEmail('')
    setFields(EMPTY_STUDENT_EDIT_FIELDS)
    setFormError(null)
    setFormLoading(false)
    setInviteLink(null)
    setInviteStatus(null)
    setInviteError(null)
    setInviteLoading(false)
    setCategoryOptions([])
    setSelectedCategoryIds([])
    setCategoriesLoading(false)
    setTrialMode('OFF')
    setManualEnrollmentStatus('ATIVO')
  }

  useEffect(() => {
    return () => resetForm()
  }, [])

  useEffect(() => {
    onLoadingChange?.(formLoading)
  }, [formLoading, onLoadingChange])

  useEffect(() => {
    if (!activeAcademyId) return
    fetchAcademySettings(activeAcademyId)
      .then((data) => {
        const parsed = parseAcademySettings(data.settings)
        setTrialMode(parsed.trial_mode ?? 'OFF')
      })
      .catch(() => setTrialMode('OFF'))
  }, [activeAcademyId])

  useEffect(() => {
    if (!activeAcademyId || !scopedProfessor) {
      setCategoryOptions([])
      setSelectedCategoryIds([])
      return
    }
    setCategoriesLoading(true)
    fetchCategories(activeAcademyId)
      .then((rows) =>
        setCategoryOptions(
          rows
            .filter((c) => c.status === 'ATIVO')
            .map((c) => ({ id: c.id, name: c.name, color: c.color })),
        ),
      )
      .catch(() => setCategoryOptions([]))
      .finally(() => setCategoriesLoading(false))
  }, [activeAcademyId, scopedProfessor])

  function toggleCategory(categoryId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  async function handleGenerateLink() {
    if (!activeAcademyId) return
    setInviteLoading(true)
    setInviteError(null)
    setInviteLink(null)
    setInviteStatus(null)
    try {
      const result = await createStudentInvite(activeAcademyId)
      setInviteLink(inviteUrl(result.token))
      setInviteStatus(inviteEmailStatusLabel(result))
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao gerar link')
    } finally {
      setInviteLoading(false)
    }
  }

  async function copyLink() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
  }

  function shareWhatsApp() {
    if (!inviteLink) return
    const message = buildStudentInviteWhatsAppMessage({
      inviteLink,
      academyName: activeAcademyName,
    })
    openWhatsAppInvite(null, message)
  }

  async function handleDirectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId) return
    if (scopedProfessor && selectedCategoryIds.length === 0) {
      setFormError('Selecione pelo menos uma modalidade das suas turmas.')
      return
    }
    setFormLoading(true)
    setFormError(null)
    try {
      const result = await createStudent({
        academyId: activeAcademyId,
        name: fields.name,
        email,
        cpf: fields.cpf || undefined,
        phone: fields.phone || undefined,
        ...(trialMode === 'MANUAL' ? { initialStatus: manualEnrollmentStatus } : {}),
        ...(fields.birthDate ? { birth_date: fields.birthDate } : {}),
        ...(fields.weightKg ? { weight_kg: Number(fields.weightKg) } : {}),
        ...(fields.heightCm ? { height_cm: Number(fields.heightCm) } : {}),
        ...(fields.emergencyName ? { emergency_contact_name: fields.emergencyName } : {}),
        ...(fields.emergencyPhone ? { emergency_contact_phone: fields.emergencyPhone } : {}),
        ...(Number(fields.fightsCount) > 0 ? { fights_count: Number(fields.fightsCount) } : {}),
        ...(Number(fields.sparringSessions) > 0
          ? { sparring_sessions: Number(fields.sparringSessions) }
          : {}),
        ...(fields.trainingStartedAt ? { training_started_at: fields.trainingStartedAt } : {}),
      })
      if (scopedProfessor && selectedCategoryIds.length > 0) {
        await updateStudentCategoriesByStaff(result.studentId, selectedCategoryIds)
      }
      resetForm()
      onSuccess()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {canInviteStudent ? (
        <CollapsibleSection title="Link de matrícula" description="Aluno preenche os dados sozinho (válido 7 dias)">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <LinkIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-text-muted)]">
                Gere um link e envie por WhatsApp ou e-mail. O aluno completa cadastro e senha no próprio celular.
              </p>
            </div>

            {inviteLink ? (
              <div className="space-y-3">
                {inviteStatus ? (
                  <FeedbackMessage variant="success">{inviteStatus}</FeedbackMessage>
                ) : null}
                <p className="break-all rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
                  {inviteLink}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" onClick={() => void copyLink()}>
                    Copiar link
                  </Button>
                  <Button type="button" variant="ghost" onClick={shareWhatsApp}>
                    WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void handleGenerateLink()}
                    disabled={inviteLoading}
                  >
                    Novo link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {inviteError ? <FeedbackMessage variant="error">{inviteError}</FeedbackMessage> : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void handleGenerateLink()}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? 'Gerando...' : 'Gerar link'}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection title="Cadastrar agora" description="Preencha os dados do aluno na academia" defaultOpen>
        <form id={formId} onSubmit={(e) => void handleDirectSubmit(e)} className="space-y-3">
          <CollapsibleSection title="Dados básicos" description="Nome, e-mail e contato" defaultOpen>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={fields.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={fields.cpf}
                    onChange={(e) => updateField('cpf', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <PhoneInput
                    id="phone"
                    value={fields.phone}
                    onChange={(value) => updateField('phone', value)}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Dados físicos" description="Medidas e emergência">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="birth">Nascimento</Label>
                <Input
                  id="birth"
                  type="date"
                  value={fields.birthDate}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={fields.weightKg}
                  onChange={(e) => updateField('weightKg', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={fields.heightCm}
                  onChange={(e) => updateField('heightCm', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="em-name">Contato emergência</Label>
                <Input
                  id="em-name"
                  value={fields.emergencyName}
                  onChange={(e) => updateField('emergencyName', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="em-phone">Tel. emergência</Label>
                <PhoneInput
                  id="em-phone"
                  value={fields.emergencyPhone}
                  onChange={(value) => updateField('emergencyPhone', value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Treino e lutas" description="Opcional — pode atualizar depois">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fights">Lutas oficiais</Label>
                <Input
                  id="fights"
                  type="number"
                  min="0"
                  value={fields.fightsCount}
                  onChange={(e) => updateField('fightsCount', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sparring">Sessões de sparring</Label>
                <Input
                  id="sparring"
                  type="number"
                  min="0"
                  value={fields.sparringSessions}
                  onChange={(e) => updateField('sparringSessions', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="training-start">Início dos treinos</Label>
                <Input
                  id="training-start"
                  type="date"
                  value={fields.trainingStartedAt}
                  onChange={(e) => updateField('trainingStartedAt', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {trialMode === 'MANUAL' ? (
            <CollapsibleSection
              title="Status inicial"
              description="Conforme configuração da academia (modo manual)"
            >
              <div className="max-w-xs">
                <Label htmlFor="enrollment-status">Status na matrícula</Label>
                <select
                  id="enrollment-status"
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                  value={manualEnrollmentStatus}
                  onChange={(e) => setManualEnrollmentStatus(e.target.value as EnrollmentStatus)}
                >
                  <option value="ATIVO">{formatStudentStatus('ATIVO')}</option>
                  <option value="TRIAL">{formatStudentStatus('TRIAL')}</option>
                </select>
              </div>
            </CollapsibleSection>
          ) : null}

          {scopedProfessor ? (
            <CollapsibleSection
              title="Modalidades"
              description="Obrigatório — escolha as turmas em que o aluno vai treinar com você"
            >
              {categoriesLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Carregando modalidades...</p>
              ) : categoryOptions.length === 0 ? (
                <FeedbackMessage variant="warning">
                  Nenhuma modalidade vinculada a você. Peça ao dono da academia para associar você a uma
                  categoria antes de cadastrar alunos.
                </FeedbackMessage>
              ) : (
                <ul className="max-h-40 space-y-2 overflow-y-auto modal-scroll">
                  {categoryOptions.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        id={`new-student-cat-${c.id}`}
                        checked={selectedCategoryIds.includes(c.id)}
                        onChange={() => toggleCategory(c.id)}
                        className="h-4 w-4 rounded border-[var(--color-border)]"
                      />
                      <label
                        htmlFor={`new-student-cat-${c.id}`}
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.color ?? '#B91C1C' }}
                        />
                        <span className="text-sm">{c.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </CollapsibleSection>
          ) : null}

          <p className="text-xs text-[var(--color-text-muted)]">
            Cadastro com senha provisória. Campos opcionais podem ser completados depois no perfil do aluno.
          </p>
          {formError ? <FeedbackMessage variant="error">{formError}</FeedbackMessage> : null}

          {!hideActions ? (
            <div className="flex flex-wrap gap-2">
              {showCancel && onCancel ? (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Salvando...' : 'Cadastrar aluno'}
              </Button>
            </div>
          ) : null}
        </form>
      </CollapsibleSection>
    </div>
  )
}
