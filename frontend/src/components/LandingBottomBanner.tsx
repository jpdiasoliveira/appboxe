interface LandingBottomBannerProps {
  imageUrl: string
  title: string
  subtitle: string
}

export function LandingBottomBanner({ imageUrl, title, subtitle }: LandingBottomBannerProps) {
  const bg = imageUrl.trim()
  if (!bg) return null

  return (
    <section
      className="relative overflow-hidden px-4 py-20 text-center"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.75), rgba(15, 23, 42, 0.85)), url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative mx-auto max-w-3xl">
        {title ? <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2> : null}
        {subtitle ? (
          <p className={`text-[var(--color-text-muted)] ${title ? 'mt-3' : ''}`}>{subtitle}</p>
        ) : null}
      </div>
    </section>
  )
}
