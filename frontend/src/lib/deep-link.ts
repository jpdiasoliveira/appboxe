/**
 * Deep links do app nativo (Capacitor) — UP-504.
 * Suporta ringpro://convite/:token e URLs https com path /convite/:token.
 */

const INVITE_PATH = /^\/convite\/([^/?#]+)/

export function pathFromDeepLink(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  if (parsed.protocol === 'ringpro:') {
    if (parsed.hostname === 'convite') {
      const token = parsed.pathname.replace(/^\//, '').trim()
      return token ? `/convite/${token}` : null
    }
    return null
  }

  const match = parsed.pathname.match(INVITE_PATH)
  if (!match) return null

  return `${parsed.pathname}${parsed.search}${parsed.hash}`
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return Boolean(capacitor?.isNativePlatform?.())
}

type NavigateFn = (to: string, options?: { replace?: boolean }) => void

export async function initCapacitorDeepLinks(navigate: NavigateFn): Promise<() => void> {
  if (!isCapacitorNative()) return () => {}

  const { App } = await import('@capacitor/app')

  const routeFromUrl = (url: string | undefined) => {
    if (!url) return
    const path = pathFromDeepLink(url)
    if (path) navigate(path, { replace: true })
  }

  const launch = await App.getLaunchUrl()
  routeFromUrl(launch?.url)

  const listener = await App.addListener('appUrlOpen', (event) => {
    routeFromUrl(event.url)
  })

  return () => {
    void listener.remove()
  }
}
