import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { slugify, DEFAULT_FEATURE_FLAGS } from '../../lib/platform-constants'
import {
  createAcademyWithOwner,
  fetchSaasPlans,
  seedDefaultFlags,
} from './platform-api'
import { supabase } from '../../lib/supabase'
import type { SaasPlan } from '../../lib/platform-types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'

export function NewAcademyPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [saasPlanId, setSaasPlanId] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchSaasPlans().then((p) => {
      setPlans(p)
      if (p[0]) setSaasPlanId(p[0].id)
    })
  }, [])

  useEffect(() => {
    if (name && !slug) setSlug(slugify(name))
  }, [name, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const finalSlug = slugify(slug || name)

      try {
        await createAcademyWithOwner({
          name,
          slug: finalSlug,
          saasPlanId,
          ownerEmail,
          ownerName,
        })
      } catch {
        const { data: academy, error: acError } = await supabase
          .from('academies')
          .insert({
            name,
            slug: finalSlug,
            saas_plan_id: saasPlanId,
            status: 'ATIVO',
          })
          .select('id')
          .single()
        if (acError) throw acError
        await seedDefaultFlags(academy.id)
        setError(
          'Academia criada. Edge Function indisponível — crie o owner manualmente ou rode o seed.',
        )
        setLoading(false)
        return
      }

      navigate('/platform/academias')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar academia')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 text-2xl font-semibold">Nova academia</h2>
      <Card>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da academia</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">/a/{slug || 'slug'}</p>
          </div>
          <div>
            <Label htmlFor="plan">Plano SaaS</Label>
            <select
              id="plan"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
              value={saasPlanId}
              onChange={(e) => setSaasPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — R$ {Number(p.price_monthly).toFixed(2)}/mês
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ownerName">Nome do proprietário</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="ownerEmail">E-mail do proprietário</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--color-warning)]">{error}</p>
          ) : null}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'Criando...' : 'Criar academia'}
          </Button>
        </form>
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">
          Flags padrão: {DEFAULT_FEATURE_FLAGS.filter((f) => f.defaultEnabled).length} módulos
          ativos.
        </p>
      </Card>
    </div>
  )
}
