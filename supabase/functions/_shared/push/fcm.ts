export interface FcmPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export interface FcmSendResult {
  sent: number
  failed: number
  invalidTokens: string[]
  skipped: boolean
}

interface FcmLegacyResponse {
  success?: number
  failure?: number
  results?: Array<{ error?: string; message_id?: string }>
}

const INVALID_TOKEN_ERRORS = new Set([
  'InvalidRegistration',
  'NotRegistered',
  'MismatchSenderId',
])

export async function sendFcmToTokens(
  serverKey: string | undefined,
  tokens: string[],
  payload: FcmPayload,
): Promise<FcmSendResult> {
  if (!serverKey) {
    return { sent: 0, failed: 0, invalidTokens: [], skipped: true }
  }

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [], skipped: false }
  }

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      priority: 'high',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`FCM HTTP ${response.status}: ${text}`)
  }

  const json = (await response.json()) as FcmLegacyResponse
  const results = json.results ?? []
  const invalidTokens: string[] = []

  results.forEach((result, index) => {
    if (result.error && INVALID_TOKEN_ERRORS.has(result.error)) {
      const token = tokens[index]
      if (token) invalidTokens.push(token)
    }
  })

  return {
    sent: json.success ?? 0,
    failed: json.failure ?? 0,
    invalidTokens,
    skipped: false,
  }
}
