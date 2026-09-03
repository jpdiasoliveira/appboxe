import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { GalleryImagesUpload, ImageUploadField } from './ImageUploadField'
import { LandingVisibilityFieldset } from './LandingVisibilityFieldset'
import type {
  GalleryPlacement,
  LandingContactCard,
  LandingSections,
  LandingVisibility,
} from '../lib/landing-types'

type SectionValue<K extends keyof LandingSections> = LandingSections[K][keyof LandingSections[K]]

interface LandingSectionsFormProps {
  academyId: string
  sections: LandingSections
  onChange: <K extends keyof LandingSections>(
    key: K,
    field: keyof LandingSections[K],
    value: SectionValue<K>,
  ) => void
  onContactCardChange: (field: keyof LandingContactCard, value: string) => void
  onVisibilityChange: (field: keyof LandingVisibility, value: boolean) => void
  compact?: boolean
  hideVisibility?: boolean
}

const GALLERY_PLACEMENT_LABEL: Record<GalleryPlacement, string> = {
  after_about: 'Depois de "Sobre"',
  after_plans: 'Depois de "Planos"',
  before_contact: 'Antes do contato',
}

function FieldHint({ children }: { children: string }) {
  return <p className="mt-1 text-xs text-[var(--color-text-muted)]">{children}</p>
}

export function LandingSectionsForm({
  academyId,
  sections,
  onChange,
  onContactCardChange,
  onVisibilityChange,
  compact = false,
  hideVisibility = false,
}: LandingSectionsFormProps) {
  return (
    <div className="space-y-6">
      {!hideVisibility ? (
        <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
          <LandingVisibilityFieldset
            visibility={sections.visibility}
            onVisibilityChange={onVisibilityChange}
          />
        </fieldset>
      ) : null}

      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-2 text-sm font-semibold">Hero (topo)</legend>
        <div>
          <Label>Título</Label>
          <Input
            value={sections.hero.title}
            onChange={(e) => onChange('hero', 'title', e.target.value)}
            placeholder="Deixe em branco para usar o nome da academia"
          />
          <FieldHint>Nome principal da página. Vazio = nome cadastrado na academia.</FieldHint>
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Input
            value={sections.hero.subtitle}
            onChange={(e) => onChange('hero', 'subtitle', e.target.value)}
          />
        </div>
        <ImageUploadField
          label="Foto de fundo do topo"
          value={sections.hero.backgroundImageUrl}
          onChange={(url) => onChange('hero', 'backgroundImageUrl', url)}
          academyId={academyId}
          uploadKind="landing"
          landingPurpose="hero"
          aspect="banner"
          hint="Imagem larga (tatame, academia, treino)."
        />
        {!compact ? (
          <div>
            <Label>Texto do botão principal</Label>
            <Input
              value={sections.hero.ctaText}
              onChange={(e) => onChange('hero', 'ctaText', e.target.value)}
            />
          </div>
        ) : null}
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
        <legend className="px-2 text-sm font-semibold">Sobre a academia</legend>
        <div>
          <Label>Título</Label>
          <Input
            value={sections.about.title}
            onChange={(e) => onChange('about', 'title', e.target.value)}
          />
        </div>
        <div>
          <Label>Texto</Label>
          <textarea
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            rows={compact ? 3 : 5}
            value={sections.about.body}
            onChange={(e) => onChange('about', 'body', e.target.value)}
          />
        </div>
        {!compact ? (
          <ImageUploadField
            label="Foto ao lado do texto"
            value={sections.about.imageUrl}
            onChange={(url) => onChange('about', 'imageUrl', url)}
            academyId={academyId}
            uploadKind="landing"
            landingPurpose="about"
            aspect="video"
            hint="Opcional. Aparece ao lado da história da academia."
          />
        ) : null}
      </fieldset>

      {!compact ? (
        <>
          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Modalidades e planos</legend>
            <div>
              <Label>Título da seção de modalidades</Label>
              <Input
                value={sections.display.categoriesTitle}
                onChange={(e) => onChange('display', 'categoriesTitle', e.target.value)}
              />
            </div>
            <div>
              <Label>Título da seção de planos</Label>
              <Input
                value={sections.display.plansTitle}
                onChange={(e) => onChange('display', 'plansTitle', e.target.value)}
              />
            </div>
            <FieldHint>
              Os cards vêm das categorias e planos públicos cadastrados na academia.
            </FieldHint>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Galeria de fotos</legend>
            <div>
              <Label>Título</Label>
              <Input
                value={sections.gallery.title}
                onChange={(e) => onChange('gallery', 'title', e.target.value)}
              />
            </div>
            <div>
              <Label>Posição na página</Label>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
                value={sections.gallery.placement}
                onChange={(e) =>
                  onChange('gallery', 'placement', e.target.value as GalleryPlacement)
                }
              >
                {(Object.keys(GALLERY_PLACEMENT_LABEL) as GalleryPlacement[]).map((key) => (
                  <option key={key} value={key}>
                    {GALLERY_PLACEMENT_LABEL[key]}
                  </option>
                ))}
              </select>
            </div>
            <GalleryImagesUpload
              label="Fotos da galeria"
              value={sections.gallery.imageUrls}
              onChange={(urls) => onChange('gallery', 'imageUrls', urls)}
              academyId={academyId}
              hint="Clique no quadrado para enviar fotos do tatame, equipe ou eventos."
            />
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Contato</legend>
            <div>
              <Label>Título da seção</Label>
              <Input
                value={sections.contact.title}
                onChange={(e) => onChange('contact', 'title', e.target.value)}
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input
                value={sections.contact.address}
                onChange={(e) => onChange('contact', 'address', e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={sections.contact.phone}
                  onChange={(e) => onChange('contact', 'phone', e.target.value)}
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={sections.contact.whatsapp}
                  onChange={(e) => onChange('contact', 'whatsapp', e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>Título do card de matrícula</Label>
              <Input
                value={sections.contact.card.title}
                onChange={(e) => onContactCardChange('title', e.target.value)}
              />
            </div>
            <div>
              <Label>Texto do card de matrícula</Label>
              <textarea
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
                rows={2}
                value={sections.contact.card.body}
                onChange={(e) => onContactCardChange('body', e.target.value)}
              />
            </div>
            <FieldHint>
              Redes sociais vêm de Configurações → Redes sociais.
            </FieldHint>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Faixa inferior (antes do rodapé)</legend>
            <ImageUploadField
              label="Foto de fundo"
              value={sections.bottomBanner.imageUrl}
              onChange={(url) => onChange('bottomBanner', 'imageUrl', url)}
              academyId={academyId}
              uploadKind="landing"
              landingPurpose="bottom-banner"
              aspect="banner"
            />
            <div>
              <Label>Título sobre a foto</Label>
              <Input
                value={sections.bottomBanner.title}
                onChange={(e) => onChange('bottomBanner', 'title', e.target.value)}
                placeholder="Ex.: Venha treinar conosco"
              />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input
                value={sections.bottomBanner.subtitle}
                onChange={(e) => onChange('bottomBanner', 'subtitle', e.target.value)}
              />
            </div>
            <FieldHint>Faixa larga com foto no final da página — ótima para diferenciar a academia.</FieldHint>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Rodapé</legend>
            <div>
              <Label>Copyright</Label>
              <Input
                value={sections.footer.copyright}
                onChange={(e) => onChange('footer', 'copyright', e.target.value)}
                placeholder="© Minha Academia — Todos os direitos reservados"
              />
            </div>
          </fieldset>
        </>
      ) : null}
    </div>
  )
}
