export type TrialMode = 'OFF' | 'DAYS' | 'FREE_CLASS' | 'MANUAL'

export type EnrollmentStatus = 'ATIVO' | 'TRIAL'

export interface AcademyTrialConfig {
  trial_mode: TrialMode
  trial_days: number
}

export const DEFAULT_TRIAL_CONFIG: AcademyTrialConfig = {
  trial_mode: 'OFF',
  trial_days: 7,
}

const TRIAL_MODES: TrialMode[] = ['OFF', 'DAYS', 'FREE_CLASS', 'MANUAL']

export function parseTrialConfig(settings: unknown): AcademyTrialConfig {
  const raw = (settings ?? {}) as Record<string, unknown>
  const mode = raw.trial_mode
  const daysRaw = raw.trial_days
  const trial_days =
    typeof daysRaw === 'number' && Number.isFinite(daysRaw)
      ? Math.max(1, Math.floor(daysRaw))
      : Math.max(1, parseInt(String(daysRaw ?? '7'), 10) || 7)

  return {
    trial_mode: TRIAL_MODES.includes(mode as TrialMode) ? (mode as TrialMode) : 'OFF',
    trial_days,
  }
}

export interface ResolvedStudentEnrollment {
  status: EnrollmentStatus
  trial_ends_at: string | null
}

export function resolveInitialStudentEnrollment(
  config: AcademyTrialConfig,
  manualStatus?: EnrollmentStatus | null,
  now: Date = new Date(),
): ResolvedStudentEnrollment {
  switch (config.trial_mode) {
    case 'DAYS': {
      const end = new Date(now)
      end.setDate(end.getDate() + config.trial_days)
      return { status: 'TRIAL', trial_ends_at: end.toISOString() }
    }
    case 'FREE_CLASS':
      return { status: 'TRIAL', trial_ends_at: null }
    case 'MANUAL':
      return manualStatus === 'TRIAL'
        ? { status: 'TRIAL', trial_ends_at: null }
        : { status: 'ATIVO', trial_ends_at: null }
    case 'OFF':
    default:
      return { status: 'ATIVO', trial_ends_at: null }
  }
}
