import { describe, expect, it } from 'vitest'
import { chargeCopyLabel, isHttpUrl, resolvePixQrImageSrc } from './charge-display'
import type { ChargeResult } from './types'

describe('charge-display', () => {
  it('detects http urls', () => {
    expect(isHttpUrl('https://api.pagar.me/qr.png')).toBe(true)
    expect(isHttpUrl('data:image/png;base64,abc')).toBe(false)
  })

  it('uses qrCodeUrl when provided by gateway', async () => {
    const url = 'https://api.pagar.me/core/v5/transactions/qr.png'
    const src = await resolvePixQrImageSrc({ copyPaste: '000201', qrCodeUrl: url })
    expect(src).toBe(url)
  })

  it('generates data url from copyPaste when qrCodeUrl is absent', async () => {
    const src = await resolvePixQrImageSrc({ copyPaste: 'PIX-MOCK-123', qrCodeUrl: null })
    expect(src).toMatch(/^data:image\/png;base64,/)
  })

  it('labels copy action by method', () => {
    const pix: ChargeResult = {
      method: 'PIX',
      status: 'PENDENTE',
      copyPaste: 'x',
      message: '',
    }
    const boleto: ChargeResult = {
      method: 'BOLETO',
      status: 'PENDENTE',
      copyPaste: 'x',
      message: '',
    }
    expect(chargeCopyLabel(pix)).toBe('PIX copia e cola')
    expect(chargeCopyLabel(boleto)).toBe('Linha digitável')
  })
})
