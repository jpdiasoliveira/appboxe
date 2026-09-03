import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/trocar-senha`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setSent(true)
  }

  return (
    <Card>
      <h1 className="mb-2 text-xl font-semibold">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Enviaremos um link para redefinir sua senha.
      </p>

      {sent ? (
        <p className="text-sm text-[var(--color-success)]">
          Verifique seu e-mail para continuar.
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
          <Button type="submit" fullWidth disabled={loading}>
            Enviar link
          </Button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-4 block text-center text-sm text-[var(--color-primary)] hover:underline"
      >
        Voltar ao login
      </Link>
    </Card>
  )
}
