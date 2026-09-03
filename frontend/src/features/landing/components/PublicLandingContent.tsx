import { LandingBottomBanner } from '../../../components/LandingBottomBanner'
import { LandingContactInfo } from '../../../components/LandingContactInfo'
import { LandingFooter } from '../../../components/LandingFooter'
import { LandingGallery } from '../../../components/LandingGallery'
import { Button } from '../../../components/ui/Button'
import type { GalleryPlacement, LandingPageData } from '../../../lib/landing-types'

interface PublicLandingContentProps {
  data: LandingPageData
  onMatricula: () => void
}

function GalleryBlock({
  title,
  imageUrls,
}: {
  title: string
  imageUrls: string
}) {
  return <LandingGallery title={title} imageUrls={imageUrls} />
}

export function PublicLandingContent({ data, onMatricula }: PublicLandingContentProps) {
  const { sections, contact } = data
  const { visibility, gallery } = sections

  const galleryEl =
    visibility.gallery ? (
      <GalleryBlock title={gallery.title} imageUrls={gallery.imageUrls} />
    ) : null

  function renderGalleryAt(placement: GalleryPlacement) {
    if (!visibility.gallery || gallery.placement !== placement) return null
    return galleryEl
  }

  return (
    <>
      {visibility.about ? (
        <section className="mx-auto max-w-5xl px-4 py-16">
          <div
            className={
              sections.about.imageUrl.trim()
                ? 'grid items-center gap-10 lg:grid-cols-2'
                : 'max-w-3xl'
            }
          >
            <div>
              <h2 className="mb-4 text-2xl font-semibold text-[var(--color-secondary)]">
                {sections.about.title}
              </h2>
              <p className="whitespace-pre-wrap text-[var(--color-text-muted)]">
                {sections.about.body}
              </p>
            </div>
            {sections.about.imageUrl.trim() ? (
              <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <img
                  src={sections.about.imageUrl.trim()}
                  alt=""
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {renderGalleryAt('after_about')}

      {visibility.categories && data.categories.length > 0 ? (
        <section className="bg-[var(--color-bg-card)] px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-center text-2xl font-semibold">
              {sections.display.categoriesTitle}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.categories.map((c) => {
                const imageUrl = c.image_url?.trim()
                return (
                  <article
                    key={c.id}
                    className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
                  >
                    {imageUrl ? (
                      <div className="relative">
                        <img
                          src={imageUrl}
                          alt=""
                          className="aspect-[4/3] w-full object-cover"
                          loading="lazy"
                        />
                        <span
                          className="absolute bottom-3 left-3 h-1 w-10 rounded"
                          style={{ backgroundColor: c.color ?? '#B91C1C' }}
                          aria-hidden
                        />
                      </div>
                    ) : (
                      <div
                        className="flex aspect-[4/3] items-end p-5"
                        style={{
                          background: `linear-gradient(145deg, ${c.color ?? '#B91C1C'}22 0%, var(--color-bg-card) 60%)`,
                        }}
                      >
                        <span
                          className="mb-0 inline-block h-2 w-8 rounded"
                          style={{ backgroundColor: c.color ?? '#B91C1C' }}
                          aria-hidden
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="font-semibold text-[var(--color-secondary)]">{c.name}</h3>
                      {c.description ? (
                        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{c.description}</p>
                      ) : null}
                      {c.schedule_label ? (
                        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{c.schedule_label}</p>
                      ) : null}
                      {c.max_capacity != null ? (
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          Até {c.max_capacity} vagas
                        </p>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {visibility.plans && data.plans.length > 0 ? (
        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="mb-8 text-center text-2xl font-semibold">{sections.display.plansTitle}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.plans.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[var(--color-border)] p-6 text-center"
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-bold text-[var(--color-primary)]">
                  {Number(p.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {p.period} · até {p.max_categories} modalidades
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {renderGalleryAt('after_plans')}
      {renderGalleryAt('before_contact')}

      {visibility.contact ? (
        <section id="contato" className="bg-[var(--color-bg-card)] px-4 py-16">
          <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-5 lg:items-start">
            <div className="lg:col-span-3">
              <LandingContactInfo contact={contact} showSocial={false} />
            </div>
            <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold">{sections.contact.card.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {sections.contact.card.body}
              </p>
              <Button type="button" className="mt-6" onClick={onMatricula}>
                {sections.hero.ctaText}
              </Button>
            </aside>
          </div>
        </section>
      ) : null}

      <LandingBottomBanner
        imageUrl={sections.bottomBanner.imageUrl}
        title={sections.bottomBanner.title}
        subtitle={sections.bottomBanner.subtitle}
      />

      <LandingFooter
        academyName={data.academyName}
        subtitle={sections.hero.subtitle}
        contact={contact}
        copyright={sections.footer.copyright}
        ctaText={sections.hero.ctaText}
        onMatricula={onMatricula}
      />
    </>
  )
}
