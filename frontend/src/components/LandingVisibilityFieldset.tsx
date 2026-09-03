import type { LandingSections, LandingVisibility } from '../lib/landing-types'

interface LandingVisibilityFieldsetProps {
  visibility: LandingSections['visibility']
  onVisibilityChange: (field: keyof LandingVisibility, value: boolean) => void
}

export function LandingVisibilityFieldset({
  visibility,
  onVisibilityChange,
}: LandingVisibilityFieldsetProps) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">Visibilidade das seções</legend>
      <p className="text-xs text-[var(--color-text-muted)]">
        Monte a página do seu jeito — esconda o que não quiser mostrar.
      </p>
      {(
        [
          ['about', 'Sobre a academia'],
          ['gallery', 'Galeria de fotos'],
          ['categories', 'Modalidades'],
          ['plans', 'Planos'],
          ['contact', 'Contato'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={visibility[key]}
            onChange={(e) => onVisibilityChange(key, e.target.checked)}
          />
          <span>Exibir {label}</span>
        </label>
      ))}
    </fieldset>
  )
}
