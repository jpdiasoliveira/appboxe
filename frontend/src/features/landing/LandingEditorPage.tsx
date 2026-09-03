import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LandingSectionsForm } from '../../components/LandingSectionsForm'
import { LandingVisibilityFieldset } from '../../components/LandingVisibilityFieldset'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import {
  DEFAULT_LANDING_SECTIONS,
  type LandingContactCard,
  type LandingSections,
  type LandingVisibility,
} from '../../lib/landing-types'
import { fetchLandingConfig, upsertLandingConfig } from './landing-api'
import { hasRole } from '../../lib/auth-utils'

export function LandingEditorPage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const { enabled, loading: flagLoading } = useFeatureFlag(activeAcademyId, 'module_landing')
  const [sections, setSections] = useState<LandingSections>(DEFAULT_LANDING_SECTIONS)
  const [published, setPublished] = useState(false)
  const [slug, setSlug] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = hasRole(roles, 'SCHOOL_OWNER')

  useEffect(() => {
    if (!activeAcademyId || !isOwner) return
    fetchLandingConfig(activeAcademyId).then((cfg) => {
      if (cfg) {
        setSections(cfg.sections)
        setPublished(cfg.published)
      }
    })
    const role = roles.find((r) => r.academy_id === activeAcademyId)
    setSlug(role?.academy?.slug ?? '')
  }, [activeAcademyId, isOwner, roles])

  if (!isOwner) {
    return <Navigate to="/academy/dashboard" replace />
  }

  if (!flagLoading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId) return
    setError(null)
    try {
      await upsertLandingConfig(activeAcademyId, sections, published)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Landing page</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Personalize textos, fotos e seções — cada academia fica com cara própria.
          </p>
        </div>
        {slug ? (
          <a
            href={`/a/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline lg:hidden"
          >
            Ver página pública →
          </a>
        ) : null}
      </div>

      <form onSubmit={handleSave}>
        <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
          <div className="space-y-6 lg:col-span-3">
            <LandingSectionsForm
              academyId={activeAcademyId ?? ''}
              sections={sections}
              onChange={updateSection}
              onContactCardChange={updateContactCard}
              onVisibilityChange={updateVisibility}
              hideVisibility
            />
          </div>

          <aside className="space-y-4 lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
            <div className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-medium">Publicar landing</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                    Visível em /a/{slug || 'slug'}
                  </span>
                </span>
              </label>

              <LandingVisibilityFieldset
                visibility={sections.visibility}
                onVisibilityChange={updateVisibility}
              />

              {slug ? (
                <a
                  href={`/a/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline"
                >
                  Ver página pública →
                </a>
              ) : null}

              {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
              {saved ? <FeedbackMessage variant="success">Salvo.</FeedbackMessage> : null}

              <Button type="submit" className="w-full sm:w-auto">
                Salvar landing
              </Button>
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 text-xs text-[var(--color-text-muted)]">
              <p className="font-medium text-[var(--color-text)]">Dicas</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>Use fotos diferentes no topo, galeria e faixa inferior.</li>
                <li>Redes sociais vêm de Configurações.</li>
                <li>Modalidades e planos vêm dos cadastros da academia.</li>
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </div>
  )
}
