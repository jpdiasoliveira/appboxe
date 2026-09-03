import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageUploadField } from '../../components/ImageUploadField'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { EMPTY_ACADEMY_SETTINGS, parseAcademySettings } from '../../lib/academy-settings'
import { DEFAULT_LANDING_SECTIONS } from '../../lib/landing-types'
import { fetchLandingConfig, upsertLandingConfig } from '../landing/landing-api'
import {
  completeAcademyOnboarding,
  fetchAcademySettings,
  fetchCategories,
  updateAcademySettings,
  upsertAcademyPlan,
  upsertCategory,
} from './academy-api'

const STEPS = ['Logo', 'Modalidades', 'Plano', 'Site'] as const
type Step = (typeof STEPS)[number]

export function AcademyOnboardingWizard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { activeAcademyId } = useAcademyContext()
  const { enabled: landingEnabled } = useFeatureFlag(activeAcademyId, 'module_landing')

  const [step, setStep] = useState<Step>('Logo')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [academyName, setAcademyName] = useState('')
  const [slug, setSlug] = useState('')
  const [settings, setSettings] = useState(EMPTY_ACADEMY_SETTINGS)

  const [categoryName, setCategoryName] = useState('')
  const [categoryColor, setCategoryColor] = useState('#B91C1C')
  const [categoryCount, setCategoryCount] = useState(0)

  const [planName, setPlanName] = useState('Mensalidade')
  const [planPrice, setPlanPrice] = useState('')

  const [publishLanding, setPublishLanding] = useState(true)
  const [heroTitle, setHeroTitle] = useState('')

  const stepIndex = STEPS.indexOf(step)
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  useEffect(() => {
    if (!activeAcademyId) return
    fetchAcademySettings(activeAcademyId)
      .then((data) => {
        setAcademyName(data.name ?? '')
        setSlug(data.slug ?? '')
        const parsed = parseAcademySettings(data.settings)
        setSettings(parsed)
        setHeroTitle((parsed.description?.trim() || data.name) ?? '')
      })
      .catch((e: Error) => setError(e.message))

    fetchCategories(activeAcademyId)
      .then((cats) => setCategoryCount(cats.filter((c) => c.status === 'ATIVO').length))
      .catch(() => setCategoryCount(0))
  }, [activeAcademyId])

  if (!activeAcademyId) {
    return <p className="text-[var(--color-danger)]">Academia não selecionada.</p>
  }

  async function saveLogo() {
    setLoading(true)
    setError(null)
    try {
      await updateAcademySettings(activeAcademyId!, { logo_url: settings.logo_url })
      setStep('Modalidades')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar logo')
    } finally {
      setLoading(false)
    }
  }

  async function addCategory() {
    if (!categoryName.trim()) {
      setError('Informe o nome da modalidade.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await upsertCategory(activeAcademyId!, { name: categoryName.trim(), color: categoryColor })
      setCategoryName('')
      setCategoryCount((n) => n + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar modalidade')
    } finally {
      setLoading(false)
    }
  }

  async function saveCategoriesStep() {
    if (categoryCount === 0) {
      setError('Cadastre pelo menos uma modalidade para continuar.')
      return
    }
    setStep('Plano')
    setError(null)
  }

  async function savePlan() {
    const price = Number(planPrice.replace(',', '.'))
    if (!planName.trim() || !Number.isFinite(price) || price <= 0) {
      setError('Informe nome e valor válido do plano.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await upsertAcademyPlan(activeAcademyId!, {
        name: planName.trim(),
        price,
        period: 'MENSAL',
        plan_kind: 'GROUP',
        max_categories: 3,
        is_public: true,
        status: 'ATIVO',
      })
      setStep('Site')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar plano')
    } finally {
      setLoading(false)
    }
  }

  async function finishOnboarding() {
    setLoading(true)
    setError(null)
    try {
      if (landingEnabled) {
        const existing = await fetchLandingConfig(activeAcademyId!)
        const sections = existing?.sections ?? DEFAULT_LANDING_SECTIONS
        const nextSections = {
          ...sections,
          hero: {
            ...sections.hero,
            title: heroTitle.trim() || academyName,
            subtitle: sections.hero.subtitle || 'Venha treinar conosco',
          },
        }
        await upsertLandingConfig(activeAcademyId!, nextSections, publishLanding)
      }
      await completeAcademyOnboarding(activeAcademyId!)
      navigate('/academy/dashboard', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao concluir onboarding')
    } finally {
      setLoading(false)
    }
  }

  const publicLandingUrl = slug ? `${window.location.origin}/a/${slug}` : null

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[var(--color-primary)]">
        Bem-vindo{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Configure sua academia</h1>
      {academyName ? (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">{academyName}</p>
      ) : (
        <div className="mb-6" />
      )}

      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
          <span>
            Passo {stepIndex + 1} de {STEPS.length}
          </span>
          <span>{step}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-elevated)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                i === stepIndex
                  ? 'bg-[var(--color-primary)] text-white'
                  : i < stepIndex
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {error ? <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p> : null}

      {step === 'Logo' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Envie o logo da academia. Ele aparece no portal e na landing pública.
          </p>
          <ImageUploadField
            academyId={activeAcademyId}
            uploadKind="logo"
            value={settings.logo_url ?? ''}
            onChange={(url) => setSettings((s) => ({ ...s, logo_url: url }))}
            label="Logo da academia"
            aspect="square"
            showUrlFallback={false}
          />
          <Button type="button" fullWidth disabled={loading} onClick={() => void saveLogo()}>
            {loading ? 'Salvando...' : 'Continuar'}
          </Button>
        </div>
      ) : null}

      {step === 'Modalidades' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Cadastre as modalidades que a academia oferece (ex.: Boxe, Muay Thai).
          </p>
          {categoryCount > 0 ? (
            <p className="text-sm text-[var(--color-success)]">
              {categoryCount} modalidade(s) cadastrada(s).
            </p>
          ) : null}
          <div>
            <Label htmlFor="ob-cat-name">Nome da modalidade</Label>
            <Input
              id="ob-cat-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Ex.: Boxe"
            />
          </div>
          <div>
            <Label htmlFor="ob-cat-color">Cor</Label>
            <Input
              id="ob-cat-color"
              type="color"
              className="h-10 w-20 p-1"
              value={categoryColor}
              onChange={(e) => setCategoryColor(e.target.value)}
            />
          </div>
          <Button type="button" variant="ghost" disabled={loading} onClick={() => void addCategory()}>
            {loading ? 'Salvando...' : 'Adicionar modalidade'}
          </Button>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setStep('Logo')}>
              Voltar
            </Button>
            <Button type="button" disabled={categoryCount === 0} onClick={() => void saveCategoriesStep()}>
              Continuar
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'Plano' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-muted)]">
            Crie o primeiro plano de mensalidade para os alunos.
          </p>
          <div>
            <Label htmlFor="ob-plan-name">Nome do plano</Label>
            <Input
              id="ob-plan-name"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ob-plan-price">Valor mensal (R$)</Label>
            <Input
              id="ob-plan-price"
              inputMode="decimal"
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              placeholder="149,90"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('Modalidades')}>
              Voltar
            </Button>
            <Button type="button" disabled={loading} onClick={() => void savePlan()}>
              {loading ? 'Salvando...' : 'Continuar'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'Site' ? (
        <div className="space-y-4">
          {landingEnabled ? (
            <>
              <p className="text-sm text-[var(--color-text-muted)]">
                Publique a landing page para captar leads. Você pode editar o conteúdo completo depois em
                Site &amp; leads.
              </p>
              <div>
                <Label htmlFor="ob-hero-title">Título da página</Label>
                <Input
                  id="ob-hero-title"
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={publishLanding}
                  onChange={(e) => setPublishLanding(e.target.checked)}
                />
                <span className="text-sm">Publicar landing agora</span>
              </label>
              {publicLandingUrl ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  URL: <span className="break-all">{publicLandingUrl}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              O módulo de landing não está ativo nesta academia. Você pode configurar depois nas
              configurações.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="ghost" onClick={() => setStep('Plano')}>
              Voltar
            </Button>
            <Button type="button" fullWidth disabled={loading} onClick={() => void finishOnboarding()}>
              {loading ? 'Concluindo...' : 'Ir para o painel'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
