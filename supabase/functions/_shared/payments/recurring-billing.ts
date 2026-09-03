export const CARD_RETRY_OFFSET_DAYS = [1, 3, 7] as const
export const MAX_CARD_CHARGE_ATTEMPTS = 1 + CARD_RETRY_OFFSET_DAYS.length

export function nextRetryDateAfterFailure(dueDateIso: string, failedAttempts: number): string | null {
  const index = failedAttempts - 1
  if (index < 0 || index >= CARD_RETRY_OFFSET_DAYS.length) return null

  const base = new Date(`${dueDateIso}T12:00:00`)
  base.setDate(base.getDate() + CARD_RETRY_OFFSET_DAYS[index])
  return base.toISOString().slice(0, 10)
}

export function shouldAttemptChargeToday(
  dueDate: string,
  chargeAttemptCount: number,
  nextChargeRetryDate: string | null,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (chargeAttemptCount >= MAX_CARD_CHARGE_ATTEMPTS) return false
  if (chargeAttemptCount === 0) return dueDate <= today
  return nextChargeRetryDate !== null && nextChargeRetryDate <= today
}

export function buildRecurringIdempotencyKey(invoiceId: string, attemptNumber: number): string {
  return `recurring:card:${invoiceId}:${attemptNumber}`
}
