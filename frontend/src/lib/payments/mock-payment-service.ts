import { supabase } from '../supabase'
import type { ChargeResult, PaymentService, TokenizeCardInput, TokenizeCardResult } from './types'

async function invokeCharge(invoiceId: string, method: 'PIX' | 'BOLETO'): Promise<ChargeResult> {
  const { data, error } = await supabase.functions.invoke('create-payment-charge', {
    body: { invoiceId, method },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error as string)
  return data as ChargeResult
}

export class MockPaymentService implements PaymentService {
  async tokenizeCard(input: TokenizeCardInput): Promise<TokenizeCardResult> {
    const lastFour = 'lastFour' in input ? input.lastFour : input.number.slice(-4)
    if (!/^\d{4}$/.test(lastFour)) {
      throw new Error('Informe os 4 últimos dígitos do cartão')
    }
    return {
      gateway: 'mock',
      token: `tok_mock_${Date.now()}`,
      brand: 'visa',
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
