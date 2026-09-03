/**
 * Envia um webhook charge.paid assinado para pagarme-webhook (teste manual UP-210).
 *
 * Uso:
 *   node scripts/test-pagarme-webhook.mjs --invoice-id <uuid> [--charge-id ch_xxx]
 *
 * .env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 * Opcional: PAGARME_WEBHOOK_SECRET (inclui x-pagarme-signature)
 */
import { randomUUID } from 'crypto'
import { loadEnv, createSupabaseClients } from './smoke/lib.mjs'
import { buildChargePaidWebhookPayload, postPagarmeWebhook } from './smoke/payments.mjs'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    const next = argv[i + 1]
    if (key === '--invoice-id' && next) {
      args.invoiceId = next
      i += 1
    } else if (key === '--charge-id' && next) {
      args.chargeId = next
      i += 1
    } else if (key === '--help' || key === '-h') {
      args.help = true
    }
  }
  return args
}

function printHelp() {
  console.log(`Uso:
  node scripts/test-pagarme-webhook.mjs --invoice-id <uuid> [--charge-id ch_xxx]

Marca a fatura como PAGO via pagarme-webhook (útil após gerar cobrança no portal ou smoke).
`)
}

async function run() {
  const args = parseArgs(process.argv)
  if (args.help || !args.invoiceId) {
    printHelp()
    process.exit(args.help ? 0 : 1)
  }

  const env = loadEnv()
  const { url } = createSupabaseClients(env)
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  const secret = env.PAGARME_WEBHOOK_SECRET ?? ''

  const payload = buildChargePaidWebhookPayload({
    invoiceId: args.invoiceId,
    chargeId: args.chargeId ?? `ch_manual_${randomUUID().slice(0, 8)}`,
  })

  console.log('POST pagarme-webhook')
  console.log(JSON.stringify(payload, null, 2))

  const { status, data } = await postPagarmeWebhook({
    url,
    anonKey,
    payload,
    secret,
  })

  console.log(`\nHTTP ${status}`)
  console.log(JSON.stringify(data, null, 2))
  process.exit(status >= 200 && status < 300 ? 0 : 1)
}

run().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
