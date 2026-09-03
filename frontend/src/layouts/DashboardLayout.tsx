/**
 * Shell padrão dos portais autenticados (Plataforma, Academia, Aluno).
 * Mobile: menu hamburger + conteúdo full-width. Desktop: sidebar fixa.
 */
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Sidebar, type NavItem } from '../components/Sidebar'
import { Topbar } from '../components/Topbar'
import { NotificationBell } from '../components/NotificationBell'
import { useAuth } from '../contexts/AuthContext'

interface DashboardLayoutProps {
  logo: string
  navItems: NavItem[]
  title?: string
  topbarExtra?: ReactNode
}

export function DashboardLayout({ logo, navItems, title, topbarExtra }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen min-w-0">
      <Sidebar
        logo={logo}
        items={navItems}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          userName={profile?.name}
          onLogout={() => void signOut()}
          onMenuClick={() => setMobileNavOpen(true)}
          extra={
            <>
              <NotificationBell />
              {topbarExtra}
            </>
          }
        />
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
