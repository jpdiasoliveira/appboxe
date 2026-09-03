import { mergeLandingSections } from '../../lib/landing-merge'
import { supabase } from '../../lib/supabase'
import { parseAcademySettings } from '../../lib/academy-settings'
import type { PublicContactInfo } from '../../lib/social-links'
import {
  type LandingConfigRow,
  type LandingPageData,
  type LandingSections,
} from '../../lib/landing-types'

function mergePublicContact(
  sections: LandingSections,
  settings: ReturnType<typeof parseAcademySettings>,
): PublicContactInfo {
  return {
    title: sections.contact.title,
    address: sections.contact.address || settings.address || '',
    phone: sections.contact.phone || settings.phone || '',
    whatsapp: sections.contact.whatsapp || settings.whatsapp || '',
    email: settings.email || '',
    instagram: settings.instagram || '',
    facebook: settings.facebook || '',
    website: settings.website || '',
    youtube: settings.youtube || '',
  }
}

export async function fetchPublicLanding(slug: string): Promise<LandingPageData | null> {
  const { data: academy, error: acErr } = await supabase
    .from('academies')
    .select('id, name, slug, settings')
    .eq('slug', slug)
    .maybeSingle()

  if (acErr || !academy) return null

  const { data: config, error: cfgErr } = await supabase
    .from('landing_page_config')
    .select('sections, published')
    .eq('academy_id', academy.id)
    .eq('published', true)
    .maybeSingle()

  if (cfgErr || !config) return null

  const raw = config.sections as Partial<LandingSections>
  const sections = mergeLandingSections(raw)
  const academySettings = parseAcademySettings(academy.settings)
  const contact = mergePublicContact(sections, academySettings)

  const [{ data: categories }, { data: plans }] = await Promise.all([
    supabase
      .from('training_categories')
      .select('id, name, description, color, schedule_label, max_capacity, image_url')
      .eq('academy_id', academy.id)
      .eq('status', 'ATIVO')
      .order('name'),
    supabase
      .from('academy_plans')
      .select('id, name, price, period, max_categories')
      .eq('academy_id', academy.id)
      .eq('is_public', true)
      .eq('status', 'ATIVO')
      .order('price'),
  ])

  return {
    academyId: academy.id,
    academyName: academy.name,
    slug: academy.slug,
    logoUrl: academySettings.logo_url?.trim() || undefined,
    selfRegisterEnabled: await fetchSelfRegisterFlag(academy.slug),
    sections,
    contact,
    categories: categories ?? [],
    plans: plans ?? [],
  }
}

async function fetchSelfRegisterFlag(slug: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('get_public_academy_flags', { p_slug: slug })
  if (error || !data) return false
  const flags = data as { found?: boolean; module_student_self_register?: boolean }
  return flags.found === true && flags.module_student_self_register === true
}

export async function fetchLandingConfig(academyId: string): Promise<LandingConfigRow | null> {
  const { data, error } = await supabase
    .from('landing_page_config')
    .select('*')
    .eq('academy_id', academyId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const raw = data.sections as Partial<LandingSections>
  const sections = mergeLandingSections(raw)

  return { ...data, sections } as LandingConfigRow
}

export async function upsertLandingConfig(
  academyId: string,
  sections: LandingSections,
  published: boolean,
) {
  const { error } = await supabase.from('landing_page_config').upsert(
    {
      academy_id: academyId,
      sections,
      published,
    },
    { onConflict: 'academy_id' },
  )
  if (error) throw error
}

export async function submitLead(input: {
  academyId: string
  name: string
  email: string
  phone?: string
  categoryInterest?: string
  message?: string
}) {
  const { error } = await supabase.from('leads').insert({
    academy_id: input.academyId,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    category_interest: input.categoryInterest ?? null,
    message: input.message ?? null,
    status: 'NOVO',
  })
  if (error) throw error
}

export function leadStatusLabel(status: string): string {
  if (status === 'CONVITE_ENVIADO') return 'Convite enviado'
  if (status === 'CONVERTIDO') return 'Convertido'
  if (status === 'NOVO') return 'Novo'
  return status
}

export function leadStatusVariant(status: string): 'success' | 'warning' | 'muted' {
  if (status === 'CONVERTIDO') return 'success'
  if (status === 'CONVITE_ENVIADO') return 'warning'
  return 'muted'
}

export async function fetchLeads(academyId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
