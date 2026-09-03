import { digitsOnly } from './phone-utils'
import { buildWhatsAppInviteUrl } from './invite-utils'

export interface PublicContactInfo {
  title: string
  address: string
  phone: string
  whatsapp: string
  email: string
  instagram: string
  facebook: string
  website: string
  youtube: string
}

export function normalizeInstagramUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http')) return trimmed
  const handle = trimmed.replace(/^@/, '')
  return `https://instagram.com/${handle}`
}

export function normalizeFacebookUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http')) return trimmed
  return `https://facebook.com/${trimmed.replace(/^@/, '')}`
}

export function normalizeYoutubeUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http')) return trimmed
  const handle = trimmed.replace(/^@/, '')
  return `https://youtube.com/@${handle}`
}

export function normalizeWebsiteUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http')) return trimmed
  return `https://${trimmed}`
}

export function buildTelUrl(phone: string): string | null {
  const digits = digitsOnly(phone)
  return digits ? `tel:+${digits.startsWith('55') ? digits : `55${digits}`}` : null
}

export function buildWhatsAppContactUrl(phone: string): string | null {
  const digits = digitsOnly(phone)
  if (!digits) return null
  return buildWhatsAppInviteUrl(phone, '')
}

export function buildMailtoUrl(email: string): string | null {
  const trimmed = email.trim()
  return trimmed ? `mailto:${trimmed}` : null
}
