import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { KpiCard } from '../../components/ui/KpiCard'
import { useStudentContext } from '../../contexts/StudentContext'
import { formatStudentStatus, studentStatusVariant } from '../../lib/student-status'
import { fetchStudentDashboard } from './student-api'
import type { StudentDashboardData } from '../../lib/student-types'

export function StudentDashboardPage() {
  const { student, loading } = useStudentContext()
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!student) return
    fetchStudentDashboard(student.id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [student])

  if (loading) return <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
  if (!student) {
    return <p className="text-[var(--color-danger)]">Perfil de aluno não encontrado.</p>
  }

  const planName = data?.subscription?.plan?.name ?? 'Nenhum'
  const nextDue = data?.pendingInvoice?.due_date ?? data?.subscription?.next_billing_date ?? '—'

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Meu painel</h2>
      {data?.student.academy?.name ? (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">{data.student.academy.name}</p>
      ) : null}

      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm text-[var(--color-text-muted)]">Status:</span>
        <Badge variant={studentStatusVariant(student.status)}>{formatStudentStatus(student.status)}</Badge>
      </div>

      {error ? <p className="mb-4 text-[var(--color-danger)]">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Plano atual" value={planName} />
        <KpiCard label="Próximo vencimento" value={nextDue} />
        <KpiCard label="Modalidades" value={String(data?.categories.length ?? 0)} />
      </div>

      {data?.pendingInvoice ? (
        <div className="mt-6 rounded-xl border border-[var(--color-warning)]/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium">Mensalidade pendente</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {Number(data.pendingInvoice.amount).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}{' '}
            — vence em {data.pendingInvoice.due_date}
          </p>
          <Link to="/student/pagamento" className="mt-3 inline-block">
            <Button>Pagar agora</Button>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
