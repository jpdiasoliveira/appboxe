import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Label } from '../../components/ui/Label'
import { DEV_PASSWORD, DEV_USER_SHORTCUTS, findDevUser } from '../../lib/dev-auth'

const IS_DEV = import.meta.env.DEV

export function LoginPage() {
  const { signIn, session, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const autoLoginAttempted = useRef(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(loginEmail: string, loginPassword: string, redirectTo?: string | null) {
    setError(null)
    setLoading(true)
    const result = await signIn(loginEmail, loginPassword)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    navigate(redirectTo || result.redirect || '/')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await handleLogin(email, password)
  }

  async function handleDevShortcut(key: string, path?: string | null) {
    const user = findDevUser(key)
    if (!user) return
    setEmail(user.email)
    setPassword(DEV_PASSWORD)
    await handleLogin(user.email, DEV_PASSWORD, path ?? user.defaultPath)
  }

  useEffect(() => {
    if (!IS_DEV || authLoading || session || autoLoginAttempted.current) return

    const devKey = searchParams.get('dev')
    if (!devKey) return

    autoLoginAttempted.current = true
    const to = searchParams.get('to')
    void handleDevShortcut(devKey, to)
  }, [authLoading, session, searchParams])

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-8 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wider text-[var(--color-primary)]">
            RINGPRO
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Gestão de academias de artes marciais
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[var(--color-text-muted)]">
              <input type="checkbox" className="rounded" />
              Lembrar-me
            </label>
            <Link to="/auth/esqueci-senha" className="text-[var(--color-primary)] hover:underline">
              Esqueci minha senha
            </Link>
          </div>

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
          Problemas para acessar? Contate o administrador da sua academia.
        </p>
      </Card>

      {IS_DEV ? (
        <Card className="border-dashed border-amber-500/40 bg-amber-500/5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
            Dev — acesso rápido
          </p>
          <p className="mb-4 text-xs text-[var(--color-text-muted)]">
            Um clique entra direto. Sem MFA nos usuários de seed.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEV_USER_SHORTCUTS.map((user) => (
              <button
                key={user.key}
                type="button"
                disabled={loading}
                onClick={() => void handleDevShortcut(user.key)}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left transition hover:border-[var(--color-primary)] disabled:opacity-50"
              >
                <span className="block text-sm font-medium text-[var(--color-text)]">{user.label}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">{user.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[var(--color-text-muted)]">
            Bookmark: <code className="text-amber-700">/login?dev=professor&amp;to=/academy/agenda</code>
          </p>
        </Card>
      ) : null}
    </div>
  )
}
