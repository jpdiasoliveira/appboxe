import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { LandingLayout } from '../../layouts/LandingLayout'
import type { LandingPageData } from '../../lib/landing-types'
import { LandingLeadForm } from './components/LandingLeadForm'
import { LandingSelfRegisterForm } from './components/LandingSelfRegisterForm'
import { PublicLandingContent } from './components/PublicLandingContent'
import { fetchPublicLanding } from './landing-api'
import { NotFoundPage } from '../shared/NotFoundPage'

type MatriculaMode = 'lead' | 'register'

export function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<LandingPageData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [matriculaMode, setMatriculaMode] = useState<MatriculaMode>('lead')

  useEffect(() => {
    if (!slug) return
    fetchPublicLanding(slug)
      .then((d) => {
        if (!d) setNotFound(true)
        else setData(d)
      })
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (loading || notFound) return
    if (window.location.hash === '#matricula') {
      setLeadModalOpen(true)
    }
  }, [loading, notFound])

  function openLeadModal(mode: MatriculaMode = 'lead') {
    setMatriculaMode(mode)
    setLeadModalOpen(true)
    window.history.replaceState(null, '', '#matricula')
  }

  function closeLeadModal() {
    setLeadModalOpen(false)
    if (window.location.hash === '#matricula') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  if (loading) {
    return (
      <LandingLayout>
        <p className="p-8 text-center text-[var(--color-text-muted)]">Carregando...</p>
      </LandingLayout>
    )
  }

  if (notFound || !data) return <NotFoundPage />

  const { sections } = data
  const heroBg = sections.hero.backgroundImageUrl?.trim()

  return (
    <LandingLayout academyName={data.academyName} logoUrl={data.logoUrl}>
      <section
        className={`relative overflow-hidden px-4 py-20 text-center ${
          heroBg ? '' : 'bg-gradient-to-br from-[var(--color-primary-dark)] to-[var(--color-bg)]'
        }`}
        style={
          heroBg
            ? {
                backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.88)), url(${heroBg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        <div className="mx-auto max-w-3xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold uppercase tracking-wide sm:text-5xl">
            {sections.hero.title || data.academyName}
          </h1>
          <p className="mt-4 text-lg text-[var(--color-text-muted)]">{sections.hero.subtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button type="button" onClick={() => openLeadModal('lead')}>
              {sections.hero.ctaText}
            </Button>
            {data.selfRegisterEnabled ? (
              <Button type="button" variant="ghost" onClick={() => openLeadModal('register')}>
                Cadastrar agora
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <PublicLandingContent
        data={data}
        onMatricula={() => openLeadModal(data.selfRegisterEnabled ? 'register' : 'lead')}
      />

      <Modal
        open={leadModalOpen}
        onClose={closeLeadModal}
        title={matriculaMode === 'register' ? 'Criar conta de aluno' : sections.hero.ctaText}
        size="md"
      >
        {matriculaMode === 'register' && data.selfRegisterEnabled ? (
          <>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Crie sua conta e continue o onboarding no portal do aluno.
            </p>
            <LandingSelfRegisterForm
              key={leadModalOpen ? 'register-open' : 'register-closed'}
              academyId={data.academyId}
              slug={data.slug}
            />
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Preencha seus dados e nossa equipe entrará em contato.
            </p>
            {data.selfRegisterEnabled ? (
              <p className="mb-4 text-sm">
                <button
                  type="button"
                  className="text-[var(--color-primary)] hover:underline"
                  onClick={() => setMatriculaMode('register')}
                >
                  Prefere se cadastrar direto? Clique aqui.
                </button>
              </p>
            ) : null}
            <LandingLeadForm
              key={leadModalOpen ? 'lead-open' : 'lead-closed'}
              academyId={data.academyId}
              categories={data.categories}
            />
          </>
        )}
      </Modal>
    </LandingLayout>
  )
}
