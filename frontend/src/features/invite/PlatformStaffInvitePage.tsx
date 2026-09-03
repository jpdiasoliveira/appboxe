import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Label } from '../../components/ui/Label'
import { LandingLayout } from '../../layouts/LandingLayout'
import { supabase } from '../../lib/supabase'
import { validatePasswordPair } from '../../lib/password-policy'
import {
  completePlatformStaffInvite,
  fetchPublicPlatformStaffInvite,
  type PublicPlatformStaffInviteInfo,
} from './platform-staff-invite-api'

const ROLE_LABEL: Record<string, string> = {
  PLATFORM_SUPPORT: 'Suporte',
  PLATFORM_FINANCE: 'Financeiro',
}

export function PlatformStaffInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [info, setInfo] = useState<PublicPlatformStaffInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  useEffect(() => {
    if (!token) return
    fetchPublicPlatformStaffInvite(token)
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
      const result = await completePlatformStaffInvite({ token, name, password })

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })
      if (signInErr) {
        setDone(true)
        return
      }
      navigate('/platform/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao completar convite')
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
    return (
      <LandingLayout>
        <div className="mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Convite inválido</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Este link expirou ou já foi utilizado.
          </p>
          <Link to="/login" className="mt-6 inline-block text-[var(--color-primary)] hover:underline">
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
          <h1 className="text-xl font-semibold">Conta criada</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Faça login com {info.email} para acessar o portal plataforma.
          </p>
          <Link to="/login" className="mt-6 inline-block text-[var(--color-primary)] hover:underline">
            Fazer login
          </Link>
        </div>
      </LandingLayout>
    )
  }

  return (
    <LandingLayout>
      <div className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold">Convite RingPro</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Você foi convidado como{' '}
          <strong>{ROLE_LABEL[info.role ?? ''] ?? info.role}</strong> da equipe plataforma.
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">E-mail: {info.email}</p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="ps-name">Nome completo</Label>
            <Input id="ps-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="ps-password">Senha</Label>
            <PasswordInput
              id="ps-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="ps-password2">Confirmar senha</Label>
            <PasswordInput
              id="ps-password2"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" fullWidth disabled={submitting}>
            {submitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </LandingLayout>
  )
}
