import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePagination } from '../../hooks/usePagination'
import { hasRole } from '../../lib/auth-utils'
import { buildStaffInviteWhatsAppMessage, openWhatsAppInvite } from '../../lib/invite-utils'
import { createStaffInvite, staffInviteEmailStatusLabel, staffInviteUrl, type StaffInviteRole } from '../invite/staff-invite-api'
import { fetchInstructors } from './academy-api'
import type { InstructorRow } from '../../lib/academy-types'

const ROLE_LABEL: Record<string, string> = {
  SCHOOL_OWNER: 'Dono',
  PROFESSOR: 'Professor',
  ASSISTANT: 'Sub-professor',
}

function instructorName(row: InstructorRow): string {
  const p = row.profile
  if (!p) return '—'
  if (Array.isArray(p)) return p[0]?.name ?? '—'
  return p.name
}

export function ProfessorsPage() {
  const { activeAcademyId, activeRole } = useAcademyContext()
  const { roles } = useAuth()
  const [rows, setRows] = useState<InstructorRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const canInvite =
    activeRole?.role === 'SCHOOL_OWNER' || hasRole(roles, 'PLATFORM_OWNER')

  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<StaffInviteRole>('PROFESSOR')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteEmailStatus, setInviteEmailStatus] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)

  const academyName =
    roles.find((r) => r.academy_id === activeAcademyId)?.academy?.name ?? undefined

  useEffect(() => {
    if (!activeAcademyId) return
    fetchInstructors(activeAcademyId)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }, [activeAcademyId])

  const pagination = usePagination(rows)

  const columns: DataColumn<InstructorRow>[] = [
    {
      id: 'name',
      header: 'Nome',
      primary: true,
      render: (row) => instructorName(row),
    },
    {
      id: 'role',
      header: 'Perfil',
      render: (row) => <Badge variant="muted">{ROLE_LABEL[row.role ?? ''] ?? row.role}</Badge>,
    },
  ]

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId || !email) return
    setLoadingInvite(true)
    setError(null)
    setInviteLink(null)
    setInviteEmailStatus(null)
    try {
      const result = await createStaffInvite(activeAcademyId, email, inviteRole)
      setInviteLink(staffInviteUrl(result.token))
      setInviteEmailStatus(staffInviteEmailStatusLabel(result, email))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar convite')
    } finally {
      setLoadingInvite(false)
    }
  }

  function shareWhatsApp() {
    if (!inviteLink) return
    const message = buildStaffInviteWhatsAppMessage({
      inviteLink,
      academyName,
      role: inviteRole,
    })
    openWhatsAppInvite(null, message)
  }

  return (
    <div>
      <PageHeader title="Professores" />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      {!canInvite ? (
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">
          Apenas o dono da academia pode enviar convites para a equipe.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        {canInvite ? (
          <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4 lg:col-span-2">
            <h3 className="mb-3 font-semibold">Convidar equipe</h3>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              Gere um link para professor ou sub-professor criar a conta. Válido por 7 dias.
            </p>
            {inviteLink ? (
              <div className="rounded-lg border border-[var(--color-success)]/40 bg-green-500/10 p-4">
                {inviteEmailStatus ? (
                  <p className="mb-2 text-sm text-[var(--color-text)]">{inviteEmailStatus}</p>
                ) : null}
                <p className="mb-2 text-sm font-medium">Link do convite:</p>
                <p className="mb-3 break-all text-xs text-[var(--color-text-muted)]">{inviteLink}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void navigator.clipboard.writeText(inviteLink)}>
                    Copiar link
                  </Button>
                  <Button type="button" variant="ghost" onClick={shareWhatsApp}>
                    Enviar por WhatsApp
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteLink(null)
                      setInviteEmailStatus(null)
                    }}
                  >
                    Novo convite
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <Label htmlFor="staff-invite-email">E-mail *</Label>
                  <Input
                    id="staff-invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="staff-invite-role">Perfil *</Label>
                  <select
                    id="staff-invite-role"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as StaffInviteRole)}
                  >
                    <option value="PROFESSOR">Professor</option>
                    <option value="ASSISTANT">Sub-professor (sem financeiro)</option>
                  </select>
                </div>
                <Button type="submit" disabled={loadingInvite}>
                  {loadingInvite ? 'Gerando...' : 'Gerar link de convite'}
                </Button>
              </form>
            )}
          </aside>
        ) : null}

        <section className={canInvite ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <ResponsiveDataList
            columns={columns}
            rows={pagination.paginatedItems}
            rowKey={(row) => row.id}
            emptyMessage="Nenhum membro da equipe listado."
            footer={
              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                from={pagination.from}
                to={pagination.to}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
              />
            }
          />
        </section>
      </div>
    </div>
  )
}
