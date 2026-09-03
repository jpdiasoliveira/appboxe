import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

export function VerifyEmailPage() {
  return (
    <Card className="text-center">
      <h1 className="mb-2 text-xl font-semibold">Confirme seu e-mail</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Enviamos um link de confirmação. Verifique sua caixa de entrada antes de entrar.
      </p>
      <Link to="/login">
        <Button variant="ghost">Voltar ao login</Button>
      </Link>
    </Card>
  )
}
