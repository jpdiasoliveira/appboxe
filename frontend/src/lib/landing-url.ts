/**
 * URLs públicas da landing — MVP path; V2 subdomínio (ver docs/decisoes/002-landing-subdomain.md).
 */
export function publicLandingPath(slug: string): string {
  return `/a/${slug}`
}

export function publicLandingUrl(slug: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, '')}${publicLandingPath(slug)}`
}

/** V2: `{slug}.ringpro.app` quando infra estiver pronta */
export function publicLandingSubdomainUrl(slug: string, apexDomain = 'ringpro.app'): string {
  return `https://${slug}.${apexDomain}`
}
