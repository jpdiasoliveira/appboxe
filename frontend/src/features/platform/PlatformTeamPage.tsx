import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { useAuth } from '../../contexts/AuthContext'
import { hasRole } from '../../lib/auth-utils'
import {
  createPlatformStaffInvite,
  fetchPlatformTeam,
  type PlatformTeamMember,
} from './platform-api'
import { platformStaffInviteUrl } from '../invite/platform-staff-invite-api'

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_OWNER: 'Dono plataforma',
  PLATFORM_SUPPORT: 'Suporte',
  PLATFORM_FINANCE: 'Financeiro',
}

function memberName(row: PlatformTeamMember): string {
  const p = row.profiles
  if (!p) return '—'
  if (Array.isArray(p)) return p[0]?.name ?? '—'
  return p.name
}

export function PlatformTeamPage() {
  const { roles } = useAuth()
  const isOwner = hasRole(roles, 'PLATFORM_OWNER')

  const [rows, setRows] = useState<PlatformTeamMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'PLATFORM_SUPPORT' | 'PLATFORM_FINANCE'>(
    'PLATFORM_SUPPORT',
  )
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)

  function reload() {
    fetchPlatformTeam()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [])

  const columns: DataColumn<PlatformTeamMember>[] = [
    {
      id: 'name',
      header: 'Nome',
      primary: true,
      render: (row) => memberName(row),
    },
    {
      id: 'role',
      header: 'Perfil',
      render: (row) => <Badge variant="muted">{ROLE_LABEL[row.role] ?? row.role}</Badge>,
    },
  ]

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoadingInvite(true)
    setError(null)
    setInviteLink(null)
    try {
      const { token } = await createPlatformStaffInvite(email.trim(), inviteRole)
      setInviteLink(platformStaffInviteUrl(token))
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar convite')
    } finally {
      setLoadingInvite(false)
    }
  }

  return (
    <div>
      <PageHeader title="Equipe plataforma" />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      {!isOwner ? (
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Somente o dono da plataforma pode convidar novos membros.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        {isOwner ? (
          <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 lg:col-span-2">
            <h3 className="mb-3 font-semibold">Convidar membro</h3>
            {inviteLink ? (
              <div className="rounded-lg border border-[var(--color-success)]/40 bg-green-500/10 p-4">
                <p className="mb-2 text-sm font-medium">Link gerado — envie por e-mail:</p>
                <p className="mb-3 break-all text-xs text-[var(--color-text-muted)]">{inviteLink}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void navigator.clipboard.writeText(inviteLink)}>
                    Copiar link
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setInviteLink(null)}>
                    Novo convite
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <Label htmlFor="platform-invite-email">E-mail</Label>
                  <Input
                    id="platform-invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="platform-invite-role">Perfil</Label>
                  <select
                    id="platform-invite-role"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as 'PLATFORM_SUPPORT' | 'PLATFORM_FINANCE')
                    }
                  >
                    <option value="PLATFORM_SUPPORT">Suporte</option>
                    <option value="PLATFORM_FINANCE">Financeiro</option>
                  </select>
                </div>
                <Button type="submit" disabled={loadingInvite}>
                  {loadingInvite ? 'Gerando...' : 'Gerar link de convite'}
                </Button>
              </form>
            )}
          </aside>
        ) : null}

        <section className={isOwner ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <ResponsiveDataList
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            emptyMessage="Nenhum membro da equipe listado."
          />
        </section>
      </div>
    </div>
  )
}
