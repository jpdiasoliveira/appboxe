/** Helpers de rota ativa para submenus do Sidebar. */

export function isPathActive(pathname: string, to: string, options?: { exclude?: string[] }): boolean {
  if (pathname === to) return true
  if (!pathname.startsWith(`${to}/`)) return false
  const rest = pathname.slice(to.length + 1)
  const segment = rest.split('/')[0]
  if (options?.exclude?.includes(segment)) return false
  return true
}

/** Lista de alunos — não marca ativo em convites. */
export function isAcademyStudentsListActive(pathname: string): boolean {
  if (pathname.startsWith('/academy/alunos/convites')) return false
  return pathname === '/academy/alunos' || pathname.startsWith('/academy/alunos/')
}

export interface NavChildMatchOptions {
  pathname: string
  to: string
  match?: (pathname: string) => boolean
}

export function isNavChildActive({ pathname, to, match }: NavChildMatchOptions): boolean {
  if (match) return match(pathname)
  return isPathActive(pathname, to)
}

export function isNavGroupActive(
  pathname: string,
  children: { to: string; match?: (pathname: string) => boolean }[],
): boolean {
  return children.some((child) => isNavChildActive({ pathname, to: child.to, match: child.match }))
}
