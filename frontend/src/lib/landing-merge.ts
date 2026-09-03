import {
  DEFAULT_LANDING_SECTIONS,
  type GalleryPlacement,
  type LandingSections,
} from './landing-types'

export function mergeLandingSections(raw: Partial<LandingSections> | undefined): LandingSections {
  return {
    hero: { ...DEFAULT_LANDING_SECTIONS.hero, ...raw?.hero },
    about: { ...DEFAULT_LANDING_SECTIONS.about, ...raw?.about },
    gallery: {
      ...DEFAULT_LANDING_SECTIONS.gallery,
      ...raw?.gallery,
      placement: (raw?.gallery?.placement as GalleryPlacement | undefined) ??
        DEFAULT_LANDING_SECTIONS.gallery.placement,
    },
    display: { ...DEFAULT_LANDING_SECTIONS.display, ...raw?.display },
    contact: {
      ...DEFAULT_LANDING_SECTIONS.contact,
      ...raw?.contact,
      card: { ...DEFAULT_LANDING_SECTIONS.contact.card, ...raw?.contact?.card },
    },
    bottomBanner: { ...DEFAULT_LANDING_SECTIONS.bottomBanner, ...raw?.bottomBanner },
    footer: { ...DEFAULT_LANDING_SECTIONS.footer, ...raw?.footer },
    visibility: { ...DEFAULT_LANDING_SECTIONS.visibility, ...raw?.visibility },
  }
}
