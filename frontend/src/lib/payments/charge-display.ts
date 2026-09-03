import type { ChargeResult } from './types'

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

export async function resolvePixQrImageSrc(
  charge: Pick<ChargeResult, 'copyPaste' | 'qrCodeUrl'>,
): Promise<string | null> {
  if (charge.qrCodeUrl && isHttpUrl(charge.qrCodeUrl)) {
    return charge.qrCodeUrl
  }

  const payload = charge.copyPaste?.trim()
  if (!payload) return null

  const QRCode = await import('qrcode')
  return QRCode.toDataURL(payload, { margin: 1, width: 240 })
}

export async function copyChargeCode(value: string): Promise<void> {
  const text = value.trim()
  if (!text) throw new Error('Nada para copiar')

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('Não foi possível copiar')
}

export function chargeCopyLabel(charge: ChargeResult): string {
  return charge.method === 'PIX' ? 'PIX copia e cola' : 'Linha digitável'
}
