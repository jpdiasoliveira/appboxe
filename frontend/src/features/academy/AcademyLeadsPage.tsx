import { useEffect, useState } from 'react'
import { LinkIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../components/ui/RowActionsMenu'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useAuth } from '../../contexts/AuthContext'
import { usePagination } from '../../hooks/usePagination'
import { buildStudentInviteWhatsAppMessage, openWhatsAppInvite } from '../../lib/invite-utils'
import {
  fetchLeads,
  leadStatusLabel,
  leadStatusVariant,
} from '../landing/landing-api'
import { createStudentInvite, inviteEmailStatusLabel, inviteUrl } from '../invite/invite-api'

interface LeadRow {
  id: string
  name: string
  email: string
  phone: string | null
  category_interest: string | null
  message: string | null
  status: string
  created_at: string
}

export function AcademyLeadsPage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const [rows, setRows] = useState<LeadRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteEmailStatus, setInviteEmailStatus] = useState<string | null>(null)
  const [inviteLeadPhone, setInviteLeadPhone] = useState<string | null>(null)
  const [inviteLeadName, setInviteLeadName] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const activeAcademyName =
    roles.find((r) => r.academy_id === activeAcademyId)?.academy?.name ?? undefined

  function reload() {
    if (!activeAcademyId) return
    fetchLeads(activeAcademyId)
      .then((d) => setRows(d as LeadRow[]))
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [activeAcademyId])

  const pagination = usePagination(rows)

  async function convertLead(lead: LeadRow) {
    if (!activeAcademyId) return
    setLoadingId(lead.id)
    setError(null)
    setInviteLink(null)
    setInviteEmailStatus(null)
    setInviteLeadPhone(null)
    setInviteLeadName(null)
    try {
      const result = await createStudentInvite(activeAcademyId, {
        email: lead.email,
        leadId: lead.id,
        prefillName: lead.name,
      })
      setInviteLink(inviteUrl(result.token))
      setInviteEmailStatus(inviteEmailStatusLabel(result, lead.email))
      setInviteLeadPhone(lead.phone)
      setInviteLeadName(lead.name)
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao converter lead')
    } finally {
      setLoadingId(null)
    }
  }

  function shareWhatsApp() {
    if (!inviteLink) return
    const message = buildStudentInviteWhatsAppMessage({
      inviteLink,
      academyName: activeAcademyName,
      recipientName: inviteLeadName ?? undefined,
    })
    openWhatsAppInvite(inviteLeadPhone, message)
  }

  const columns: DataColumn<LeadRow>[] = [
    { id: 'name', header: 'Nome', primary: true, render: (row) => row.name },
    {
      id: 'contact',
      header: 'Contato',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => (
        <>
          {row.email}
          {row.phone ? ` · ${row.phone}` : ''}
        </>
      ),
    },
    {
      id: 'interest',
      header: 'Interesse',
      render: (row) => row.category_interest ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={leadStatusVariant(row.status)}>{leadStatusLabel(row.status)}</Badge>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Leads da landing"
        description="Converta interessados em alunos com um clique — gera o convite e envia por WhatsApp ou e-mail."
      />

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}
      {inviteLink ? (
        <div className="mb-4 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5 p-4">
          <p className="mb-2 text-sm font-medium">{inviteEmailStatus}</p>
          <p className="mb-2 break-all text-xs">{inviteLink}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={() => void navigator.clipboard.writeText(inviteLink)}>
              Copiar link
            </Button>
            <Button type="button" variant="ghost" onClick={shareWhatsApp}>
              Enviar por WhatsApp
            </Button>
          </div>
        </div>
      ) : null}

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum lead ainda."
        renderActions={(row) => (
          <RowActionsMenu
            ariaLabel={`Ações do lead ${row.name}`}
            items={
              row.status !== 'CONVERTIDO'
                ? [
                    {
                      id: 'convert',
                      label:
                        loadingId === row.id
                          ? 'Gerando convite...'
                          : row.status === 'CONVITE_ENVIADO'
                            ? 'Reenviar convite'
                            : 'Converter em aluno',
                      icon: row.status === 'CONVITE_ENVIADO' ? LinkIcon : UserPlusIcon,
                      disabled: loadingId === row.id,
                      onClick: () => void convertLead(row),
                    },
                  ]
                : []
            }
          />
        )}
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
    </div>
  )
}
