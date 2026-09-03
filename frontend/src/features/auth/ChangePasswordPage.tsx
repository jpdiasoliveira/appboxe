import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { getRedirectForRole, pickPrimaryRole } from '../../lib/auth-utils'
import { Button } from '../../components/ui/Button'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'
import { MIN_PASSWORD_LENGTH, validatePasswordPair } from '../../lib/password-policy'

export function ChangePasswordPage() {
  const { user, roles, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const passwordError = validatePasswordPair(password, confirm)
    if (passwordError) {
      setError(passwordError)
      return
    }
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false })
        .eq('user_id', user.id)
    }

    await refreshProfile()
    setLoading(false)

    const role = pickPrimaryRole(roles)
    navigate(role ? getRedirectForRole(role) : '/login')
  }

  return (
    <Card>
      <h1 className="mb-2 text-xl font-semibold">Trocar senha</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Defina uma nova senha para continuar.
      </p>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Mínimo de {MIN_PASSWORD_LENGTH} caracteres
          </p>
        </div>
        <div>
          <Label htmlFor="confirm">Confirmar senha</Label>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>
        {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
        <Button type="submit" fullWidth disabled={loading}>
          Salvar senha
        </Button>
      </form>
    </Card>
  )
}
