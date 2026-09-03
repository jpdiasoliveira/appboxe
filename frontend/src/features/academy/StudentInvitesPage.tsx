import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
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
  cancelStudentInvite,
  fetchPendingStudentInvites,
  inviteEmailStatusLabel,
  inviteUrl,
  resendStudentInvite,
  type PendingStudentInvite,
} from '../invite/invite-api'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function StudentInvitesPage() {
  const { activeAcademyId } = useAcademyContext()
  const { roles } = useAuth()
  const [rows, setRows] = useState<PendingStudentInvite[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [action, setAction] = useState<'resend' | 'cancel' | null>(null)

  const activeAcademyName =
    roles.find((r) => r.academy_id === activeAcademyId)?.academy?.name ?? undefined

  const loadInvites = useCallback(() => {
    if (!activeAcademyId) return
    fetchPendingStudentInvites(activeAcademyId)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }, [activeAcademyId])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  const pagination = usePagination(rows)

  async function handleResend(invite: PendingStudentInvite) {
    if (!activeAcademyId) return
    setLoadingId(invite.id)
    setAction('resend')
    setError(null)
    setSuccess(null)
    try {
      const result = await resendStudentInvite(activeAcademyId, invite.id)
      setSuccess(
        `Convite reenviado — validade até ${formatDate(result.expiresAt)}. ${inviteEmailStatusLabel(result, invite.email ?? undefined)}`,
      )
      loadInvites()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao reenviar convite')
    } finally {
      setLoadingId(null)
      setAction(null)
    }
  }

  async function handleCancel(invite: PendingStudentInvite) {
    if (!activeAcademyId) return
    if (!window.confirm(`Cancelar convite para ${invite.email}?`)) return
    setLoadingId(invite.id)
    setAction('cancel')
    setError(null)
    setSuccess(null)
    try {
      await cancelStudentInvite(activeAcademyId, invite.id)
      setSuccess(`Convite para ${invite.email} cancelado.`)
      loadInvites()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao cancelar convite')
    } finally {
      setLoadingId(null)
      setAction(null)
    }
  }

  function shareWhatsApp(invite: PendingStudentInvite) {
    const link = inviteUrl(invite.token)
    const message = buildStudentInviteWhatsAppMessage({
      inviteLink: link,
      academyName: activeAcademyName,
      recipientName: invite.prefill_name ?? undefined,
    })
    openWhatsAppInvite(null, message)
  }

  const columns: DataColumn<PendingStudentInvite>[] = [
    { id: 'email', header: 'E-mail', primary: true, render: (row) => row.email ?? 'Aluno define no link' },
    {
      id: 'name',
      header: 'Nome sugerido',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.prefill_name ?? '—',
    },
    {
      id: 'created',
      header: 'Criado em',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => formatDate(row.created_at),
    },
    {
      id: 'expires',
      header: 'Validade',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => formatDate(row.expires_at),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={isExpired(row.expires_at) ? 'warning' : 'muted'}>
          {isExpired(row.expires_at) ? 'Expirado' : 'Pendente'}
        </Badge>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <Link to="/academy/alunos" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Voltar para alunos
        </Link>
      </div>

      <PageHeader
        title="Convites pendentes"
        description="Convites de matrícula aguardando conclusão pelo aluno. Reenviar renova a validade por 7 dias (mesmo link)."
        actions={
          <Link to="/academy/alunos/novo" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">Novo convite</Button>
          </Link>
        }
      />

      {error ? (
        <FeedbackMessage variant="error" className="mb-4">
          {error}
        </FeedbackMessage>
      ) : null}
      {success ? (
        <FeedbackMessage variant="success" className="mb-4">
          {success}
        </FeedbackMessage>
      ) : null}

      <ResponsiveDataList
        columns={columns}
        rows={pagination.paginatedItems}
        rowKey={(row) => row.id}
        emptyMessage="Nenhum convite pendente."
        renderActions={(row) => {
          const busy = loadingId === row.id
          return (
            <RowActionsMenu
              ariaLabel={`Ações do convite ${row.email ?? 'aberto'}`}
              items={[
                {
                  id: 'copy',
                  label: 'Copiar link',
                  icon: ClipboardDocumentIcon,
                  disabled: busy,
                  onClick: () => void navigator.clipboard.writeText(inviteUrl(row.token)),
                },
                {
                  id: 'whatsapp',
                  label: 'WhatsApp',
                  icon: ChatBubbleLeftIcon,
                  disabled: busy,
                  onClick: () => shareWhatsApp(row),
                },
                {
                  id: 'resend',
                  label: busy && action === 'resend' ? 'Reenviando...' : 'Reenviar',
                  icon: ArrowPathIcon,
                  disabled: busy,
                  onClick: () => void handleResend(row),
                },
                {
                  id: 'cancel',
                  label: busy && action === 'cancel' ? 'Cancelando...' : 'Cancelar',
                  icon: XMarkIcon,
                  disabled: busy,
                  danger: true,
                  onClick: () => void handleCancel(row),
                },
              ]}
            />
          )
        }}
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
