/** Telefone BR — máscara (XX) XXXXX-XXXX ou (XX) XXXX-XXXX */

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '')
}

/** Formata para exibição / input (até 11 dígitos). */
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

/** Aplica máscara enquanto o usuário digita. */
export function formatPhoneInput(value: string): string {
  return formatPhoneBR(value)
}

/** Normaliza antes de salvar no banco (null se vazio). */
export function normalizePhoneForStorage(phone: string | null | undefined): string | null {
  const formatted = formatPhoneBR(phone)
  return formatted || null
}

/** Exibição em tabelas e cards. */
export function formatPhoneDisplay(phone: string | null | undefined, fallback = '—'): string {
  const formatted = formatPhoneBR(phone)
  return formatted || fallback
}
