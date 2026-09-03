import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Label } from '../../components/ui/Label'
import { LandingLayout } from '../../layouts/LandingLayout'
import { supabase } from '../../lib/supabase'
import { MIN_PASSWORD_LENGTH, validatePasswordPair } from '../../lib/password-policy'
import {
  completeStaffInvite,
  fetchPublicStaffInvite,
  type PublicStaffInviteInfo,
} from './staff-invite-api'

const ROLE_LABEL: Record<string, string> = {
  PROFESSOR: 'Professor',
  ASSISTANT: 'Sub-professor',
}

export function StaffInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [info, setInfo] = useState<PublicStaffInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  useEffect(() => {
    if (!token) return
    fetchPublicStaffInvite(token)
      .then(setInfo)
      .catch(() => setInfo({ valid: false, reason: 'NOT_FOUND' }))
      .finally(() => setLoading(false))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !info?.valid) return
    const passwordError = validatePasswordPair(password, passwordConfirm)
    if (passwordError) {
      setError(passwordError)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await completeStaffInvite({ token, name, password })

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })
      if (signInErr) {
        setDone(true)
        return
      }
      navigate('/academy/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <LandingLayout>
        <p className="p-8 text-center text-[var(--color-text-muted)]">Carregando convite...</p>
      </LandingLayout>
    )
  }

  if (!info?.valid) {
    const messages: Record<string, string> = {
      NOT_FOUND: 'Convite não encontrado ou inválido.',
      EXPIRED: 'Este convite expirou. Peça um novo link ao dono da academia.',
      ALREADY_USED: 'Este convite já foi utilizado.',
      ACADEMY_INACTIVE: 'A academia não está ativa no momento.',
    }
    return (
      <LandingLayout>
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">Convite indisponível</h1>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            {messages[info?.reason ?? ''] ?? 'Não foi possível validar o convite.'}
          </p>
          <Link to="/login" className="text-sm text-[var(--color-primary)] hover:underline">
            Ir para login
          </Link>
        </div>
      </LandingLayout>
    )
  }

  if (done) {
    return (
      <LandingLayout>
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold">Conta criada</h1>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            Faça login com o e-mail {info.email} para acessar o portal da academia.
          </p>
          <Link to="/login">
            <Button>Fazer login</Button>
          </Link>
        </div>
      </LandingLayout>
    )
  }

  return (
    <LandingLayout>
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-1 text-2xl font-semibold">Convite para equipe</h1>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          {info.academy_name} · {ROLE_LABEL[info.role ?? ''] ?? info.role}
        </p>
        <p className="mb-4 text-sm">
          E-mail: <strong>{info.email}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="staff-name">Nome completo *</Label>
            <Input id="staff-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="staff-password">Senha *</Label>
            <PasswordInput
              id="staff-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Mínimo de {MIN_PASSWORD_LENGTH} caracteres
            </p>
          </div>
          <div>
            <Label htmlFor="staff-password2">Confirmar senha *</Label>
            <PasswordInput
              id="staff-password2"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Criando conta...' : 'Criar conta e entrar'}
          </Button>
        </form>
      </div>
    </LandingLayout>
  )
}
