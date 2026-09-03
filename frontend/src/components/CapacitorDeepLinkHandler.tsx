import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { initCapacitorDeepLinks } from '../lib/deep-link'

/** Registra deep links Capacitor (ringpro://convite/:token). No-op no browser. */
export function CapacitorDeepLinkHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    let cleanup = () => {}
    void initCapacitorDeepLinks((to, options) => navigate(to, options)).then((dispose) => {
      cleanup = dispose
    })
    return () => cleanup()
  }, [navigate])

  return null
}
