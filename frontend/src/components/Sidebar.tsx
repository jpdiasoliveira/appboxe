/**
 * Sidebar único do RingPro — desktop colapsável + drawer no mobile.
 * Suporta itens planos (`to`) e grupos (`children`) reutilizáveis em todos os portais.
 */
import { useEffect, useId, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'
import { isNavChildActive, isNavGroupActive } from '../lib/nav-match'

export interface NavChildItem {
  to: string
  label: string
  match?: (pathname: string) => boolean
}

export interface NavItem {
  label: string
  icon?: ReactNode
  to?: string
  children?: NavChildItem[]
}

interface SidebarProps {
  logo: string
  items: NavItem[]
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const STORAGE_KEY = 'ringpro-sidebar-collapsed'

function linkClass(isActive: boolean, collapsed: boolean, indented = false) {
  return `group relative flex min-h-10 items-center gap-3 py-2 text-sm transition-colors ${
    collapsed ? 'justify-center px-0' : indented ? 'pl-8 pr-5' : 'px-5'
  } ${
    isActive
      ? 'border-r-[3px] border-[var(--color-primary)] bg-red-900/10 text-[var(--color-text)]'
      : 'text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]'
  }`
}

function groupButtonClass(isActive: boolean, collapsed: boolean) {
  return `group relative flex w-full min-h-11 items-center gap-3 py-2.5 text-left text-sm transition-colors ${
    collapsed ? 'justify-center px-0' : 'px-5'
  } ${
    isActive
      ? 'border-r-[3px] border-[var(--color-primary)] bg-red-900/10 text-[var(--color-text)]'
      : 'text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]'
  }`
}

function NavTooltip({ label }: { label: string }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  )
}

function NavGroup({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  const location = useLocation()
  const panelId = useId()
  const children = item.children ?? []
  const groupActive = isNavGroupActive(location.pathname, children)
  const [open, setOpen] = useState(false)

  if (children.length === 0) return null

  if (collapsed) {
    return (
      <div className="group relative">
        <button
          type="button"
          className={groupButtonClass(groupActive, true)}
          aria-label={item.label}
          aria-haspopup="true"
        >
          <span className="shrink-0">{item.icon}</span>
          <NavTooltip label={item.label} />
        </button>
        <div className="pointer-events-none absolute left-full top-0 z-50 ml-1 min-w-[11rem] rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] py-1 opacity-0 shadow-lg transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            {item.label}
          </p>
          {children.map((child) => {
            const active = isNavChildActive({ pathname: location.pathname, ...child })
            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={`block px-3 py-2 text-sm ${
                  active
                    ? 'bg-red-900/10 text-[var(--color-text)]'
                    : 'text-[var(--color-text-muted)] hover:bg-red-900/5 hover:text-[var(--color-text)]'
                }`}
              >
                {child.label}
              </NavLink>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        className={groupButtonClass(groupActive, false)}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="shrink-0">{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div id={panelId} className="flex flex-col gap-0.5 pb-1">
          {children.map((child) => {
            const active = isNavChildActive({ pathname: location.pathname, ...child })
            return (
              <NavLink
                key={child.to}
                to={child.to}
                onClick={onNavigate}
                className={linkClass(active, false, true)}
              >
                <span className="truncate">{child.label}</span>
              </NavLink>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function NavItems({
  items,
  collapsed,
  onNavigate,
}: {
  items: NavItem[]
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <>
      {items.map((item) => {
        if (item.children && item.children.length > 0) {
          return (
            <NavGroup
              key={item.label}
              item={item}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          )
        }

        if (!item.to) return null

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) => linkClass(isActive, collapsed)}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
            {collapsed ? <NavTooltip label={item.label} /> : null}
          </NavLink>
        )
      })}
    </>
  )
}

export function Sidebar({ logo, items, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      // localStorage indisponível
    }
  }, [collapsed])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  return (
    <>
      <aside
        className={`relative hidden min-h-screen shrink-0 flex-col overflow-visible border-r border-[var(--color-border)] bg-[var(--color-accent)] transition-[width] duration-200 ease-in-out lg:flex ${
          collapsed ? 'w-[4.25rem]' : 'w-60'
        }`}
      >
        <div
          className={`flex shrink-0 items-center border-b border-[var(--color-border)]/50 ${
            collapsed ? 'flex-col gap-2 px-2 py-4' : 'justify-between gap-2 px-4 py-5'
          }`}
        >
          <span
            className={`font-[family-name:var(--font-display)] font-bold tracking-wide text-[var(--color-primary)] ${
              collapsed ? 'text-lg' : 'truncate text-xl'
            }`}
          >
            {collapsed ? logo.charAt(0) : logo}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-900/10 hover:text-[var(--color-text)]"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? (
              <ChevronDoubleRightIcon className="h-5 w-5" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-visible py-2">
          <NavItems items={items} collapsed={collapsed} />
        </nav>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Fechar menu"
            onClick={onMobileClose}
          />
          <aside className="relative flex h-full w-[min(18rem,85vw)] flex-col border-r border-[var(--color-border)] bg-[var(--color-accent)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 px-4 py-4">
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-[var(--color-primary)]">
                {logo}
              </span>
              <button
                type="button"
                onClick={onMobileClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-red-900/10"
                aria-label="Fechar menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
              <NavItems items={items} collapsed={false} onNavigate={onMobileClose} />
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  )
}
