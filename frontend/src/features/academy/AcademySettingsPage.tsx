import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LandingSectionsForm } from '../../components/LandingSectionsForm'
import { ImageUploadField } from '../../components/ImageUploadField'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { hasRole } from '../../lib/auth-utils'
import { EMPTY_ACADEMY_SETTINGS, parseAcademySettings } from '../../lib/academy-settings'
import { TRIAL_MODE_OPTIONS } from '../../lib/trial-policy'
import { DEFAULT_LANDING_SECTIONS, type LandingContactCard, type LandingSections, type LandingVisibility } from '../../lib/landing-types'
import { fetchLandingConfig, upsertLandingConfig } from '../landing/landing-api'
import { fetchAcademySettings, fetchInstructors, updateAcademySettings } from './academy-api'
import { AcademyContractSection } from './components/AcademyContractSection'

const ROLE_LABEL: Record<string, string> = {
  SCHOOL_OWNER: 'Dono',
  PROFESSOR: 'Professor',
  ASSISTANT: 'Sub-professor',
}

export function AcademySettingsPage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const { enabled: landingEnabled } = useFeatureFlag(activeAcademyId, 'module_landing')
  const { enabled: makeupEnabled } = useFeatureFlag(activeAcademyId, 'module_class_makeup')
  const { enabled: physicalAssessmentEnabled } = useFeatureFlag(
    activeAcademyId,
    'module_physical_assessment',
  )
  const isOwner = hasRole(roles, 'SCHOOL_OWNER')

  const [academyName, setAcademyName] = useState('')
  const [slug, setSlug] = useState('')
  const [settings, setSettings] = useState(EMPTY_ACADEMY_SETTINGS)
  const [instructors, setInstructors] = useState<Awaited<ReturnType<typeof fetchInstructors>>>([])
  const [sections, setSections] = useState<LandingSections>(DEFAULT_LANDING_SECTIONS)
  const [published, setPublished] = useState(false)

  const [saved, setSaved] = useState(false)
  const [landingSaved, setLandingSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeAcademyId) return
    fetchAcademySettings(activeAcademyId)
      .then((data) => {
        setAcademyName(data.name ?? '')
        setSlug(data.slug ?? '')
        setSettings(parseAcademySettings(data.settings))
      })
      .catch((e: Error) => setError(e.message))

    fetchInstructors(activeAcademyId)
      .then(setInstructors)
      .catch(() => setInstructors([]))

    if (isOwner && landingEnabled) {
      fetchLandingConfig(activeAcademyId).then((cfg) => {
        if (cfg) {
          setSections(cfg.sections)
          setPublished(cfg.published)
        }
      })
    }
  }, [activeAcademyId, isOwner, landingEnabled])

  async function handleSaveAcademy(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId) return
    setError(null)
    try {
      await updateAcademySettings(activeAcademyId, { ...settings })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    }
  }

  async function handleSaveLanding(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId) return
    setError(null)
    try {
      await upsertLandingConfig(activeAcademyId, sections, published)
      setLandingSaved(true)
      setTimeout(() => setLandingSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar landing')
    }
  }

  function updateSection<K extends keyof LandingSections>(
    key: K,
    field: keyof LandingSections[K],
    value: LandingSections[K][keyof LandingSections[K]],
  ) {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }

  function updateContactCard(field: keyof LandingContactCard, value: string) {
    setSections((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        card: { ...prev.contact.card, [field]: value },
      },
    }))
  }

  function updateVisibility(field: keyof LandingVisibility, value: boolean) {
    setSections((prev) => ({
      ...prev,
      visibility: { ...prev.visibility, [field]: value },
    }))
  }

  function instructorName(row: (typeof instructors)[number]): string {
    const p = row.profile
    if (!p) return '—'
    if (Array.isArray(p)) return p[0]?.name ?? '—'
    return p.name
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Configurações</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Dados da academia, redes sociais, equipe e landing pública.
        </p>
      </div>

      {error ? (
        <FeedbackMessage variant="error">{error}</FeedbackMessage>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <form
          onSubmit={handleSaveAcademy}
          className="space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 lg:col-span-3"
        >
        <div>
          <h3 className="font-semibold">Dados da academia</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {academyName ? `${academyName} · /a/${slug}` : null}
          </p>
        </div>

        {activeAcademyId ? (
          <ImageUploadField
            label="Logo da academia"
            value={settings.logo_url ?? ''}
            onChange={(url) => setSettings((s) => ({ ...s, logo_url: url }))}
            academyId={activeAcademyId}
            uploadKind="logo"
            aspect="square"
            hint="Aparece no cabeçalho da landing pública. PNG ou JPG com fundo transparente funciona bem."
          />
        ) : null}

        <div>
          <Label htmlFor="description">Descrição curta</Label>
          <textarea
            id="description"
            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            rows={3}
            placeholder="Apresentação da academia para uso interno e materiais"
            value={settings.description}
            onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={settings.address}
              onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={settings.phone}
              onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={settings.whatsapp}
              onChange={(e) => setSettings((s) => ({ ...s, whatsapp: e.target.value }))}
              placeholder="(11) 99999-0000"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">E-mail de contato</Label>
            <Input
              id="email"
              type="email"
              value={settings.email}
              onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
            />
          </div>
        </div>

        {isOwner ? (
          <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
            <div>
              <h4 className="text-sm font-semibold">Período experimental</h4>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Define como novos alunos entram na academia (status Experimental na interface).
              </p>
            </div>
            <div className="space-y-3">
              {TRIAL_MODE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <input
                    type="radio"
                    name="trial_mode"
                    value={opt.value}
                    checked={(settings.trial_mode ?? 'OFF') === opt.value}
                    onChange={() =>
                      setSettings((s) => ({ ...s, trial_mode: opt.value }))
                    }
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {(settings.trial_mode ?? 'OFF') === 'DAYS' ? (
              <div className="max-w-xs">
                <Label htmlFor="trial_days">Dias de experimental</Label>
                <Input
                  id="trial_days"
                  type="number"
                  min={1}
                  max={365}
                  value={settings.trial_days ?? 7}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      trial_days: Math.max(1, parseInt(e.target.value, 10) || 7),
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {isOwner && makeupEnabled ? (
          <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
            <div>
              <h4 className="text-sm font-semibold">Reposição de aula</h4>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Validade padrão dos créditos concedidos após falta na chamada.
              </p>
            </div>
            <div className="max-w-xs">
              <Label htmlFor="makeup_credit_days">Dias de validade do crédito</Label>
              <Input
                id="makeup_credit_days"
                type="number"
                min={1}
                max={365}
                value={settings.makeup_credit_days ?? 30}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    makeup_credit_days: Math.max(1, parseInt(e.target.value, 10) || 30),
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {isOwner && physicalAssessmentEnabled ? (
          <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-4">
            <div>
              <h4 className="text-sm font-semibold">Avaliação física periódica</h4>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Intervalo para lembrete automático de atualização de peso e altura (aluno e equipe).
              </p>
            </div>
            <div className="max-w-xs">
              <Label htmlFor="physical_assessment_interval_months">Intervalo (meses)</Label>
              <Input
                id="physical_assessment_interval_months"
                type="number"
                min={1}
                max={24}
                value={settings.physical_assessment_interval_months ?? 6}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    physical_assessment_interval_months: Math.max(1, parseInt(e.target.value, 10) || 6),
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {isOwner && activeAcademyId ? (
          <AcademyContractSection academyId={activeAcademyId} isOwner={isOwner} />
        ) : null}

        <div>
          <h4 className="mb-3 text-sm font-semibold">Redes sociais</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={settings.instagram}
                onChange={(e) => setSettings((s) => ({ ...s, instagram: e.target.value }))}
                placeholder="@academia ou URL"
              />
            </div>
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={settings.facebook}
                onChange={(e) => setSettings((s) => ({ ...s, facebook: e.target.value }))}
                placeholder="URL da página"
              />
            </div>
            <div>
              <Label htmlFor="website">Site</Label>
              <Input
                id="website"
                value={settings.website}
                onChange={(e) => setSettings((s) => ({ ...s, website: e.target.value }))}
                placeholder="https://"
              />
            </div>
            <div>
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                value={settings.youtube}
                onChange={(e) => setSettings((s) => ({ ...s, youtube: e.target.value }))}
                placeholder="URL do canal"
              />
            </div>
          </div>
        </div>

        {saved ? (
          <FeedbackMessage variant="success">Dados salvos.</FeedbackMessage>
        ) : null}
        <Button type="submit">Salvar dados da academia</Button>
        </form>

        <aside className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Equipe</h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Professores e sub-professores vinculados à academia.
                </p>
              </div>
              <Link to="/academy/professores">
                <Button type="button" variant="ghost">
                  Gerenciar equipe
                </Button>
              </Link>
            </div>
            {instructors.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Nenhum membro cadastrado.</p>
            ) : (
              <ul className="space-y-2">
                {instructors.map((row) => (
                  <li
                    key={row.user_id}
                    className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  >
                    <span>{instructorName(row)}</span>
                    <Badge variant="muted">{ROLE_LABEL[row.role ?? ''] ?? row.role}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {isOwner && landingEnabled ? (
        <form onSubmit={handleSaveLanding} className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Landing page</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Edição rápida — ou use o{' '}
                <Link to="/academy/landing" className="text-[var(--color-primary)] hover:underline">
                  editor completo
                </Link>
                .
              </p>
            </div>
            {slug ? (
              <a
                href={`/a/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Ver página →
              </a>
            ) : null}
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span className="text-sm">Publicar landing em /a/{slug || 'slug'}</span>
          </label>

          <LandingSectionsForm
            academyId={activeAcademyId ?? ''}
            sections={sections}
            onChange={updateSection}
            onContactCardChange={updateContactCard}
            onVisibilityChange={updateVisibility}
            compact
          />

          {landingSaved ? (
            <FeedbackMessage variant="success">Landing salva.</FeedbackMessage>
          ) : null}
          <Button type="submit">Salvar landing</Button>
        </form>
      ) : null}

      {!isOwner && landingEnabled ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          A edição da landing page é feita pelo dono da academia em{' '}
          <Link to="/academy/landing" className="text-[var(--color-primary)] hover:underline">
            Landing
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}
