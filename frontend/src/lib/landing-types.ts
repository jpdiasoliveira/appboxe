import type { PublicContactInfo } from './social-links'

export type GalleryPlacement = 'after_about' | 'after_plans' | 'before_contact'

export interface LandingHero {
  title: string
  subtitle: string
  ctaText: string
  backgroundImageUrl: string
}

export interface LandingAbout {
  title: string
  body: string
  imageUrl: string
}

export interface LandingGallery {
  title: string
  imageUrls: string
  placement: GalleryPlacement
}

export interface LandingDisplay {
  categoriesTitle: string
  plansTitle: string
}

export interface LandingContactCard {
  title: string
  body: string
}

export interface LandingContact {
  title: string
  address: string
  phone: string
  whatsapp: string
  card: LandingContactCard
}

export interface LandingBottomBanner {
  imageUrl: string
  title: string
  subtitle: string
}

export interface LandingFooter {
  copyright: string
}

export interface LandingVisibility {
  about: boolean
  gallery: boolean
  categories: boolean
  plans: boolean
  contact: boolean
}

export interface LandingSections {
  hero: LandingHero
  about: LandingAbout
  gallery: LandingGallery
  display: LandingDisplay
  contact: LandingContact
  bottomBanner: LandingBottomBanner
  footer: LandingFooter
  visibility: LandingVisibility
}

export interface LandingPageData {
  academyId: string
  academyName: string
  slug: string
  logoUrl?: string
  selfRegisterEnabled?: boolean
  sections: LandingSections
  contact: PublicContactInfo
  categories: {
    id: string
    name: string
    description: string | null
    color: string | null
    schedule_label?: string | null
    max_capacity?: number | null
    image_url?: string | null
  }[]
  plans: { id: string; name: string; price: number; period: string; max_categories: number }[]
}

export interface LandingConfigRow {
  id: string
  academy_id: string
  sections: LandingSections
  published: boolean
}

export const DEFAULT_LANDING_SECTIONS: LandingSections = {
  hero: {
    title: 'Sua academia de artes marciais',
    subtitle: 'Treine com os melhores. Venha fazer parte do time.',
    ctaText: 'Quero me matricular',
    backgroundImageUrl: '',
  },
  about: {
    title: 'Sobre nós',
    body: 'Conte a história da sua academia, missão e valores.',
    imageUrl: '',
  },
  gallery: {
    title: 'Nossa academia',
    imageUrls: '',
    placement: 'before_contact',
  },
  display: {
    categoriesTitle: 'Modalidades',
    plansTitle: 'Planos',
  },
  contact: {
    title: 'Entre em contato',
    address: '',
    phone: '',
    whatsapp: '',
    card: {
      title: 'Pronto para começar?',
      body: 'Fale com nossa equipe ou envie seus dados. Respondemos o mais rápido possível.',
    },
  },
  bottomBanner: {
    imageUrl: '',
    title: '',
    subtitle: '',
  },
  footer: {
    copyright: '© RingPro — Todos os direitos reservados',
  },
  visibility: {
    about: true,
    gallery: true,
    categories: true,
    plans: true,
    contact: true,
  },
}
