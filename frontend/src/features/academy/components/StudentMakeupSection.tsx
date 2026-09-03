import { useEffect, useState } from 'react'
import { ArrowPathIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { Select } from '../../../components/ui/Select'
import { ResponsiveDataList, type DataColumn } from '../../../components/ui/ResponsiveDataList'
import { RowActionsMenu } from '../../../components/ui/RowActionsMenu'
import {
  MAKEUP_STATUS_LABELS,
  makeupStatusVariant,
  type ClassMakeupCreditRow,
} from '../../../lib/makeup-types'
import {
  cancelMakeupCredit,
  fetchStudentMakeupCredits,
  grantMakeupCredit,
  redeemMakeupCredit,
} from '../makeup-api'

interface StudentMakeupSectionProps {
  studentId: string
  categories: { id: string; name: string }[]
  canManage: boolean
}

function categoryName(credit: ClassMakeupCreditRow): string {
  const cat = credit.training_category
  if (Array.isArray(cat)) return cat[0]?.name ?? '—'
  return cat?.name ?? '—'
}

export function StudentMakeupSection({
  studentId,
  categories,
  canManage,
}: StudentMakeupSectionProps) {
  const [credits, setCredits] = useState<ClassMakeupCreditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [grantCategoryId, setGrantCategoryId] = useState('')
  const [grantNotes, setGrantNotes] = useState('')
  const [granting, setGranting] = useState(false)

  const [redeemCreditId, setRedeemCreditId] = useState('')
  const [redeemDate, setRedeemDate] = useState(new Date().toISOString().slice(0, 10))
  const [redeemStart, setRedeemStart] = useState('18:00')
  const [redeemEnd, setRedeemEnd] = useState('19:00')
  const [redeeming, setRedeeming] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchStudentMakeupCredits(studentId)
      setCredits(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar reposições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [studentId])

  useEffect(() => {
    if (!grantCategoryId && categories.length > 0) {
      setGrantCategoryId(categories[0].id)
    }
  }, [categories, grantCategoryId])

  const availableCredits = credits.filter((c) => c.status === 'DISPONIVEL')

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !grantCategoryId) return
    setGranting(true)
    setError(null)
    try {
      await grantMakeupCredit({
        studentId,
        trainingCategoryId: grantCategoryId,
        notes: grantNotes.trim() || undefined,
      })
      setGrantNotes('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conceder crédito')
    } finally {
      setGranting(false)
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || !redeemCreditId) return
    setRedeeming(true)
    setError(null)
    try {
      await redeemMakeupCredit({
        creditId: redeemCreditId,
        sessionDate: redeemDate,
        timeStart: redeemStart,
        timeEnd: redeemEnd,
      })
      setRedeemCreditId('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar reposição')
    } finally {
      setRedeeming(false)
    }
  }

  async function handleCancel(creditId: string) {
    if (!canManage) return
    if (!window.confirm('Cancelar este crédito de reposição?')) return
    setBusyId(creditId)
    setError(null)
    try {
      await cancelMakeupCredit(creditId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar crédito')
    } finally {
      setBusyId(null)
    }
  }

  const columns: DataColumn<ClassMakeupCreditRow>[] = [
    {
      id: 'category',
      header: 'Modalidade',
      primary: true,
      render: (credit) => categoryName(credit),
    },
    {
      id: 'status',
      header: 'Status',
      render: (credit) => (
        <Badge variant={makeupStatusVariant(credit.status)}>
          {MAKEUP_STATUS_LABELS[credit.status]}
        </Badge>
      ),
    },
    {
      id: 'expires',
      header: 'Validade',
      render: (credit) => new Date(credit.expires_at).toLocaleDateString('pt-BR'),
    },
    {
      id: 'session',
      header: 'Aula agendada',
      render: (credit) => {
        const session = credit.redemption?.class_session
        const row = Array.isArray(session) ? session[0] : session
        if (!row) return '—'
        return `${new Date(row.starts_at).toLocaleString('pt-BR')} · ${row.title}`
      },
    },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Conceda créditos quando o aluno faltar e agende a aula de reposição. O aluno recebe
        notificação in-app e vê a aula na agenda.
      </p>

      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form
            onSubmit={handleGrant}
            className="space-y-3 rounded-xl border border-[var(--color-border)] p-4"
          >
            <h3 className="text-sm font-semibold">Conceder crédito</h3>
            <div>
              <Label htmlFor="makeup-category">Modalidade</Label>
              <Select
                id="makeup-category"
                value={grantCategoryId}
                onChange={(e) => setGrantCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="makeup-notes">Observações</Label>
              <Input
                id="makeup-notes"
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Ex.: falta na chamada de 02/09"
              />
            </div>
            <Button type="submit" disabled={granting || categories.length === 0}>
              <PlusIcon className="mr-1 h-4 w-4" />
              {granting ? 'Concedendo...' : 'Conceder crédito'}
            </Button>
          </form>

          <form
            onSubmit={handleRedeem}
            className="space-y-3 rounded-xl border border-[var(--color-border)] p-4"
          >
            <h3 className="text-sm font-semibold">Agendar reposição</h3>
            <div>
              <Label htmlFor="makeup-credit">Crédito disponível</Label>
              <Select
                id="makeup-credit"
                value={redeemCreditId}
                onChange={(e) => setRedeemCreditId(e.target.value)}
                required
              >
                <option value="">Selecione...</option>
                {availableCredits.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryName(c)} · até{' '}
                    {new Date(c.expires_at).toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="makeup-date">Data</Label>
              <Input
                id="makeup-date"
                type="date"
                value={redeemDate}
                onChange={(e) => setRedeemDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="makeup-start">Início</Label>
                <Input
                  id="makeup-start"
                  type="time"
                  value={redeemStart}
                  onChange={(e) => setRedeemStart(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="makeup-end">Fim</Label>
                <Input
                  id="makeup-end"
                  type="time"
                  value={redeemEnd}
                  onChange={(e) => setRedeemEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={redeeming || availableCredits.length === 0}>
              <ArrowPathIcon className="mr-1 h-4 w-4" />
              {redeeming ? 'Agendando...' : 'Agendar reposição'}
            </Button>
          </form>
        </div>
      ) : (
        <p className="text-xs text-[var(--color-text-muted)]">Somente leitura.</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando créditos...</p>
      ) : (
        <ResponsiveDataList
          columns={columns}
          rows={credits}
          rowKey={(credit) => credit.id}
          emptyMessage="Nenhum crédito de reposição registrado."
          renderActions={(credit) =>
            canManage && credit.status === 'DISPONIVEL' ? (
              <RowActionsMenu
                ariaLabel="Ações do crédito"
                items={[
                  {
                    id: 'cancel',
                    label: busyId === credit.id ? 'Cancelando...' : 'Cancelar crédito',
                    icon: XMarkIcon,
                    disabled: busyId === credit.id,
                    onClick: () => void handleCancel(credit.id),
                  },
                ]}
              />
            ) : null
          }
        />
      )}
    </div>
  )
}
