import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { useStudentContext } from '../../contexts/StudentContext'
import { redeemAttendanceQrCheckin } from '../academy/attendance-qr-api'

export function StudentQrCheckInPage() {
  const { token } = useParams<{ token: string }>()
  const { student } = useStudentContext()
  const { enabled, loading: flagLoading } = useFeatureFlag(student?.academy_id ?? null, 'module_attendance')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !student || flagLoading || !enabled) return
    if (status !== 'idle') return

    setStatus('loading')
    redeemAttendanceQrCheckin(token)
      .then(() => {
        setStatus('success')
        setMessage('Presença confirmada com sucesso!')
      })
      .catch((err: Error) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [token, student, flagLoading, enabled, status])

  if (!flagLoading && !enabled) {
    return <Navigate to="/student/dashboard" replace />
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <h2 className="mb-2 text-2xl font-semibold">Check-in</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Confirme sua presença na aula de hoje.
      </p>

      {status === 'loading' || status === 'idle' ? (
        <p className="text-sm text-[var(--color-text-muted)]">Validando QR...</p>
      ) : null}

      {status === 'success' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-[var(--color-success)]">
            <CheckCircleIcon className="h-8 w-8 shrink-0" />
            <p className="font-medium">{message}</p>
          </div>
          <Link to="/student/agenda">
            <Button fullWidth>Ver minha agenda</Button>
          </Link>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="space-y-4">
          <FeedbackMessage variant="error">
            <span className="flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 shrink-0" />
              {message ?? 'Não foi possível confirmar presença.'}
            </span>
          </FeedbackMessage>
          <Link to="/student/dashboard">
            <Button variant="ghost" fullWidth>
              Voltar ao dashboard
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  )
}
