import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-[var(--color-text-muted)]">Página não encontrada.</p>
      <Link to="/login">
        <Button variant="ghost">Ir para login</Button>
      </Link>
    </div>
  )
}
