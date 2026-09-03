import { useEffect, useState } from 'react'
import { fetchSaasPlans, upsertSaasPlan } from './platform-api'
import type { SaasPlan } from '../../lib/platform-types'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { Card } from '../../components/ui/Card'

export function PlatformSettingsPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [maxStudents, setMaxStudents] = useState('100')

  function reload() {
    fetchSaasPlans().then(setPlans)
  }

  useEffect(() => {
    reload()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    await upsertSaasPlan({
      name,
      price_monthly: parseFloat(price),
      max_students: parseInt(maxStudents, 10),
      status: 'ATIVO',
    })
    setName('')
    setPrice('')
    reload()
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Configurações — Planos SaaS</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Planos cadastrados</h3>
          <ul className="space-y-2 text-sm">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex justify-between border-b border-[var(--color-border)] py-2"
              >
                <span>{p.name}</span>
                <span className="text-[var(--color-text-muted)]">
                  R$ {Number(p.price_monthly).toFixed(2)} · até {p.max_students} alunos
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Novo plano</h3>
          <form onSubmit={(e) => void handleAdd(e)} className="space-y-3">
            <div>
              <Label htmlFor="pname">Nome</Label>
              <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pprice">Preço mensal (R$)</Label>
              <Input
                id="pprice"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="pmax">Máx. alunos</Label>
              <Input
                id="pmax"
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Adicionar plano</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
