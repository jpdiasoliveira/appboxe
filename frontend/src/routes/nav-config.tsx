/**
 * Menus por portal — cada rota usa o mesmo `Sidebar`/`DashboardLayout`.
 * Itens com `children` viram submenu expansível (padrão RingPro).
 */
import {
  BuildingOffice2Icon,
  GlobeAltIcon,
  HomeIcon,
  UserGroupIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  TagIcon,
  CalendarDaysIcon,
  BellIcon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import type { NavItem } from '../components/Sidebar'
import type { UserAcademyRole } from '../lib/types'
import { canManageAcademy } from '../lib/academy-permissions'
import { isAcademyStudentsListActive } from '../lib/nav-match'

export const platformNav: NavItem[] = [
  { to: '/platform/dashboard', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
  {
    to: '/platform/academias',
    label: 'Academias',
    icon: <BuildingOffice2Icon className="h-5 w-5" />,
  },
  {
    to: '/platform/equipe',
    label: 'Equipe',
    icon: <UserGroupIcon className="h-5 w-5" />,
  },
  {
    to: '/platform/financeiro',
    label: 'Financeiro',
    icon: <CreditCardIcon className="h-5 w-5" />,
  },
  {
    to: '/platform/configuracoes',
    label: 'Configurações',
    icon: <Cog6ToothIcon className="h-5 w-5" />,
  },
  {
    to: '/platform/auditoria',
    label: 'Auditoria',
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
  },
  {
    to: '/platform/seguranca',
    label: 'Segurança',
    icon: <ShieldCheckIcon className="h-5 w-5" />,
  },
]

export function getAcademyNav(
  activeRole: UserAcademyRole | null,
  showFinance: boolean,
  showAttendance: boolean,
  showSchedule: boolean,
  showLanding: boolean,
  showClassGroups = false,
  showGraduation = false,
): NavItem[] {
  const isOwner = activeRole ? canManageAcademy([activeRole]) : false

  const items: NavItem[] = [
    { to: '/academy/dashboard', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
  ]

  if (showSchedule) {
    items.push({
      to: '/academy/agenda',
      label: 'Agenda',
      icon: <CalendarDaysIcon className="h-5 w-5" />,
    })
  }

  const alunoChildren = [
    {
      to: '/academy/alunos',
      label: 'Lista',
      match: isAcademyStudentsListActive,
    },
    ...(isOwner ? [{ to: '/academy/alunos/convites', label: 'Convites' }] : []),
  ]

  if (isOwner) {
    items.push({
      label: 'Alunos',
      icon: <UserGroupIcon className="h-5 w-5" />,
      children: alunoChildren,
    })
  } else {
    items.push({
      to: '/academy/alunos',
      label: 'Alunos',
      icon: <UserGroupIcon className="h-5 w-5" />,
    })
  }

  if (isOwner) {
    items.push({
      to: '/academy/professores',
      label: 'Professores',
      icon: <AcademicCapIcon className="h-5 w-5" />,
    })
  }

  items.push({
    to: '/academy/categorias',
    label: 'Categorias',
    icon: <TagIcon className="h-5 w-5" />,
  })

  if (showClassGroups) {
    items.push({
      to: '/academy/turmas',
      label: 'Turmas',
      icon: <UserGroupIcon className="h-5 w-5" />,
    })
  }

  if (showGraduation) {
    items.push({
      to: '/academy/graduacao',
      label: 'Graduação',
      icon: <AcademicCapIcon className="h-5 w-5" />,
    })
  }

  if (isOwner) {
    items.push({
      to: '/academy/planos',
      label: 'Planos',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
    })
  }

  if (showFinance && isOwner) {
    items.push({
      to: '/academy/financeiro',
      label: 'Financeiro',
      icon: <CreditCardIcon className="h-5 w-5" />,
    })
  }

  if (showAttendance) {
    items.push({
      label: 'Presença',
      icon: <ClipboardDocumentCheckIcon className="h-5 w-5" />,
      children: [
        { to: '/academy/presenca', label: 'Chamada' },
        { to: '/academy/presenca/qr', label: 'Check-in QR' },
        { to: '/academy/relatorios/presenca', label: 'Relatório' },
      ],
    })
  }

  if (showLanding && isOwner) {
    items.push({
      label: 'Site & leads',
      icon: <GlobeAltIcon className="h-5 w-5" />,
      children: [
        { to: '/academy/landing', label: 'Landing' },
        { to: '/academy/leads', label: 'Leads' },
      ],
    })
  }

  if (isOwner) {
    items.push({
      to: '/academy/filiais',
      label: 'Filiais',
      icon: <BuildingOffice2Icon className="h-5 w-5" />,
    })
    items.push({
      to: '/academy/configuracoes',
      label: 'Configurações',
      icon: <Cog6ToothIcon className="h-5 w-5" />,
    })
  }

  items.push({
    to: '/academy/notificacoes',
    label: 'Notificações',
    icon: <BellIcon className="h-5 w-5" />,
  })

  return items
}

export const studentNav: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: <HomeIcon className="h-5 w-5" /> },
  { to: '/student/agenda', label: 'Agenda', icon: <CalendarDaysIcon className="h-5 w-5" /> },
  { to: '/student/meu-plano', label: 'Meu plano', icon: <CreditCardIcon className="h-5 w-5" /> },
  { to: '/student/modalidades', label: 'Modalidades', icon: <TagIcon className="h-5 w-5" /> },
  { to: '/student/turmas', label: 'Turmas', icon: <UserGroupIcon className="h-5 w-5" /> },
  { to: '/student/graduacao', label: 'Faixas', icon: <AcademicCapIcon className="h-5 w-5" /> },
  { to: '/student/pagamento', label: 'Pagamento', icon: <CreditCardIcon className="h-5 w-5" /> },
  {
    to: '/student/historico',
    label: 'Histórico',
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
  },
  { to: '/student/perfil', label: 'Perfil', icon: <UserIcon className="h-5 w-5" /> },
]
