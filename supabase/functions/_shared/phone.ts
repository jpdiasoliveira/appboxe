/** Telefone BR — mesma regra do frontend (`lib/phone-utils.ts`). */

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function formatPhoneBR(phone: string | null | undefined): string {
  const d = digitsOnly(phone ?? '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function normalizePhoneForStorage(phone: string | null | undefined): string | null {
  const formatted = formatPhoneBR(phone)
  return formatted || null
}
