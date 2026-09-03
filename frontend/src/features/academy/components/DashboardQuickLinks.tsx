import { Link } from 'react-router-dom'
import {
  CalendarDaysIcon,
  ChartBarSquareIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

const LINKS = [
  {
    to: '/academy/alunos',
    label: 'Alunos',
    description: 'Lista e matrículas',
    icon: UserGroupIcon,
  },
  {
    to: '/academy/presenca',
    label: 'Presença',
    description: 'Registrar chamada',
    icon: ClipboardDocumentCheckIcon,
  },
  {
    to: '/academy/relatorios/presenca',
    label: 'Relatório',
    description: 'Frequência e faltas',
    icon: ChartBarSquareIcon,
  },
  {
    to: '/academy/agenda',
    label: 'Agenda',
    description: 'Aulas e horários',
    icon: CalendarDaysIcon,
  },
] as const

export function DashboardQuickLinks() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      <h3 className="mb-3 text-sm font-semibold">Atalhos</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-3 transition-colors hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg)]"
          >
            <link.icon className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            <div className="min-w-0">
              <p className="text-sm font-medium">{link.label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
