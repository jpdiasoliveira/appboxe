import { MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { LandingSocialLinks } from './LandingSocialLinks'
import { formatPhoneDisplay } from '../lib/phone-utils'
import type { PublicContactInfo } from '../lib/social-links'
import { buildTelUrl, buildWhatsAppContactUrl } from '../lib/social-links'

interface LandingFooterProps {
  academyName: string
  subtitle: string
  contact: PublicContactInfo
  copyright: string
  ctaText: string
  onMatricula: () => void
}

export function LandingFooter({
  academyName,
  subtitle,
  contact,
  copyright,
  ctaText,
  onMatricula,
}: LandingFooterProps) {
  const telUrl = buildTelUrl(contact.phone)
  const whatsappUrl = buildWhatsAppContactUrl(contact.whatsapp)

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-[var(--color-primary)]">
            {academyName}
          </p>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{subtitle}</p>
          ) : null}
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Contato
          </h3>
          <ul className="space-y-2 text-sm text-[var(--color-text-muted)]">
            {contact.address ? (
              <li className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{contact.address}</span>
              </li>
            ) : null}
            {contact.phone ? (
              <li className="flex items-center gap-2">
                <PhoneIcon className="h-4 w-4 shrink-0" />
                {telUrl ? (
                  <a href={telUrl} className="hover:text-[var(--color-text)] hover:underline">
                    {formatPhoneDisplay(contact.phone)}
                  </a>
                ) : (
                  formatPhoneDisplay(contact.phone)
                )}
              </li>
            ) : null}
            {contact.whatsapp && whatsappUrl ? (
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--color-text)] hover:underline"
                >
                  WhatsApp: {formatPhoneDisplay(contact.whatsapp)}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Matrícula
          </h3>
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">
            Dê o primeiro passo e treine com a gente.
          </p>
          <Button type="button" onClick={onMatricula}>
            {ctaText}
          </Button>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Redes
          </h3>
          <LandingSocialLinks contact={contact} compact />
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-4 text-center text-xs text-[var(--color-text-muted)]">
        {copyright}
      </div>
    </footer>
  )
}
