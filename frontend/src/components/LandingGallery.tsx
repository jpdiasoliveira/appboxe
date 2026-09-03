import { parseGalleryUrls } from '../lib/landing-utils'

interface LandingGalleryProps {
  title: string
  imageUrls: string
}

export function LandingGallery({ title, imageUrls }: LandingGalleryProps) {
  const images = parseGalleryUrls(imageUrls)
  if (images.length === 0) return null

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-center text-2xl font-semibold">{title}</h2>
        <div
          className={`grid gap-3 ${
            images.length === 1
              ? 'max-w-2xl mx-auto'
              : images.length === 2
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {images.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="aspect-[4/3] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
