import { DEFAULT_TRIAL_CONFIG, parseTrialConfig, type TrialMode } from './trial-policy'

export interface AcademySettings {
  address?: string
  phone?: string
  whatsapp?: string
  email?: string
  description?: string
  logo_url?: string
  instagram?: string
  facebook?: string
  website?: string
  youtube?: string
  trial_mode?: TrialMode
  trial_days?: number
  /** Dias de validade do crédito de reposição (UP-312) */
  makeup_credit_days?: number
  /** Intervalo em meses para lembrete de peso/altura (UP-305) */
  physical_assessment_interval_months?: number
  /** false = dono deve passar pelo wizard UP-401; ausente ou true = concluído */
  onboarding_completed?: boolean
}

export const EMPTY_ACADEMY_SETTINGS: AcademySettings = {
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  description: '',
  logo_url: '',
  instagram: '',
  facebook: '',
  website: '',
  youtube: '',
}

export function parseAcademySettings(raw: unknown): AcademySettings {
  const s = (raw ?? {}) as Record<string, string>
  const trial = parseTrialConfig(raw)
  return {
    address: s.address ?? '',
    phone: s.phone ?? '',
    whatsapp: s.whatsapp ?? '',
    email: s.email ?? '',
    description: s.description ?? '',
    logo_url: s.logo_url ?? '',
    instagram: s.instagram ?? '',
    facebook: s.facebook ?? '',
    website: s.website ?? '',
    youtube: s.youtube ?? '',
    trial_mode: trial.trial_mode,
    trial_days: trial.trial_days,
    makeup_credit_days:
      typeof (raw as Record<string, unknown>)?.makeup_credit_days === 'number'
        ? ((raw as Record<string, unknown>).makeup_credit_days as number)
        : 30,
    physical_assessment_interval_months:
      typeof (raw as Record<string, unknown>)?.physical_assessment_interval_months === 'number'
        ? ((raw as Record<string, unknown>).physical_assessment_interval_months as number)
        : 6,
    onboarding_completed:
      typeof (raw as Record<string, unknown>)?.onboarding_completed === 'boolean'
        ? ((raw as Record<string, unknown>).onboarding_completed as boolean)
        : undefined,
  }
}

export function needsAcademyOnboarding(settings: AcademySettings): boolean {
  return settings.onboarding_completed === false
}

export { DEFAULT_TRIAL_CONFIG }
