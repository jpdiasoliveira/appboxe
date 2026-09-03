import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { PhoneInput } from '../../../components/ui/PhoneInput'
import { PasswordInput } from '../../../components/ui/PasswordInput'
import { supabase } from '../../../lib/supabase'
import { validatePasswordPair } from '../../../lib/password-policy'
import { publicStudentRegister } from '../public-register-api'

interface LandingSelfRegisterFormProps {
  academyId: string
  slug: string
}

export function LandingSelfRegisterForm({ academyId, slug }: LandingSelfRegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const passwordError = validatePasswordPair(password, passwordConfirm)
    if (passwordError) {
      setError(passwordError)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await publicStudentRegister({
        academyId,
        slug,
        name,
        email,
        phone,
        password,
      })

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })

      if (signInErr) {
        setDone(true)
        return
      }

      window.location.href = '/student/onboarding'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="space-y-3 text-sm">
        <FeedbackMessage variant="success">
          Conta criada! Faça login com {email} para continuar.
        </FeedbackMessage>
        <Link to="/login" className="text-[var(--color-primary)] hover:underline">
          Ir para login
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <div>
        <Label htmlFor="reg-name">Nome completo</Label>
        <Input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="reg-email">E-mail</Label>
        <Input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="reg-phone">Telefone</Label>
        <PhoneInput id="reg-phone" value={phone} onChange={setPhone} />
      </div>
      <div>
        <Label htmlFor="reg-password">Senha</Label>
        <PasswordInput
          id="reg-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="reg-password2">Confirmar senha</Label>
        <PasswordInput
          id="reg-password2"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          required
        />
      </div>
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? 'Cadastrando...' : 'Criar minha conta'}
      </Button>
    </form>
  )
}
