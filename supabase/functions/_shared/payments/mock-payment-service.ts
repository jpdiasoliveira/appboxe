import type { CardChargeInput, CardChargeResult, ChargeMethod, ChargeResult, CreateChargeInput, PaymentService, WebhookParseResult } from './types.ts'

function buildStubCharge(method: ChargeMethod, input: CreateChargeInput): ChargeResult {
  const code = `${method === 'PIX' ? 'PIX' : 'BOL'}-${input.invoiceId.slice(0, 8)}`
  return {
    method,
    status: 'PENDENTE',
    copyPaste: code,
    barcode: method === 'BOLETO' ? `34191.${code}` : null,
    qrCodeUrl: null,
    boletoUrl: null,
    gatewayProvider: 'mock',
    gatewayChargeId: `mock_${input.invoiceId}`,
    gatewayMetadata: {
      mode: 'mock',
      invoice_id: input.invoiceId,
      copy_paste: code,
      barcode: method === 'BOLETO' ? `34191.${code}` : null,
    },
    message: 'Cobrança gerada (mock). Use simular pagamento ou configure PAGARME_API_KEY para live.',
  }
}

export class MockPaymentService implements PaymentService {
  async createPix(input: CreateChargeInput): Promise<ChargeResult> {
    return buildStubCharge('PIX', input)
  }

  async createBoleto(input: CreateChargeInput): Promise<ChargeResult> {
    return buildStubCharge('BOLETO', input)
  }

  async chargeCard(input: CardChargeInput): Promise<CardChargeResult> {
    const failed = input.cardToken.includes('fail')
    return {
      status: failed ? 'FALHOU' : 'PAGO',
      gatewayProvider: 'mock',
      gatewayChargeId: failed ? null : `mock_card_${input.invoiceId}`,
      gatewayMetadata: {
        mode: 'mock',
        invoice_id: input.invoiceId,
        card_token_suffix: input.cardToken.slice(-4),
      },
      message: failed ? 'Cobrança recusada (mock).' : 'Cobrança aprovada (mock).',
    }
  }

  parseWebhook(_payload: string, _signature: string | null): WebhookParseResult | null {
    return null
  }
}
