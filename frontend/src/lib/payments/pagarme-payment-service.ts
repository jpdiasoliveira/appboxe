import { supabase } from '../supabase'
import type {
  CardTokenInput,
  ChargeResult,
  PaymentService,
  TokenizeCardInput,
  TokenizeCardResult,
} from './types'
import { isMockCardInput } from './types'

const PAGARME_API_BASE = 'https://api.pagar.me/core/v5'

type PagarmeTokenResponse = {
  id?: string
  card?: {
    brand?: string
    last_four_digits?: string
  }
  message?: string
}

async function invokeCharge(invoiceId: string, method: 'PIX' | 'BOLETO'): Promise<ChargeResult> {
  const { data, error } = await supabase.functions.invoke('create-payment-charge', {
    body: { invoiceId, method },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as ChargeResult
}

function detectBrand(number: string): string | null {
  if (/^4/.test(number)) return 'visa'
  if (/^5[1-5]/.test(number)) return 'mastercard'
  if (/^3[47]/.test(number)) return 'amex'
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(number)) return 'elo'
  return null
}

export class PagarmePaymentService implements PaymentService {
  private readonly publicKey: string

  constructor(publicKey: string) {
    this.publicKey = publicKey
  }

  async tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult> {
    if (isMockCardInput(input)) {
      throw new Error('Modo live exige dados completos do cartão para tokenização Pagar.me')
    }

    const card = input as CardTokenInput
    const publicKey = this.publicKey.trim()
    if (!publicKey) {
      throw new Error('VITE_PAGARME_PUBLIC_KEY não configurada')
    }

    const res = await fetch(`${PAGARME_API_BASE}/tokens?appId=${encodeURIComponent(publicKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'card',
        card: {
          number: card.number.replace(/\D/g, ''),
          holder_name: card.holderName.trim(),
          exp_month: card.expMonth,
          exp_year: card.expYear,
          cvv: card.cvv,
        },
      }),
    })

    const payload = (await res.json()) as PagarmeTokenResponse
    if (!res.ok || !payload.id) {
      throw new Error(payload.message ?? 'Falha ao tokenizar cartão no Pagar.me')
    }

    const lastFour = payload.card?.last_four_digits ?? card.number.slice(-4)
    return {
      gateway: 'pagarme',
      token: payload.id,
      brand: payload.card?.brand ?? detectBrand(card.number),
      lastFour,
    }
  }

  async createPix(invoiceId: string): Promise<ChargeResult> {
    return invokeCharge(invoiceId, 'PIX')
  }

  async createBoleto(invoiceId: string): Promise<ChargeResult> {
    return invokeCharge(invoiceId, 'BOLETO')
  }
}
