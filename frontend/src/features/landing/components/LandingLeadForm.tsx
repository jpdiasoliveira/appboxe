import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { submitLead } from '../landing-api'

interface LandingLeadFormProps {
  academyId: string
  categories: { id: string; name: string }[]
  onSuccess?: () => void
}

export function LandingLeadForm({ academyId, categories, onSuccess }: LandingLeadFormProps) {
  const [leadSent, setLeadSent] = useState(false)
  const [leadError, setLeadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    categoryInterest: '',
    message: '',
  })

  async function handleLead(e: React.FormEvent) {
    e.preventDefault()
    setLeadError(null)
    setSubmitting(true)
    try {
      await submitLead({
        academyId,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        categoryInterest: form.categoryInterest || undefined,
        message: form.message || undefined,
      })
      setLeadSent(true)
      setForm({ name: '', email: '', phone: '', categoryInterest: '', message: '' })
      onSuccess?.()
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Erro ao enviar')
    } finally {
      setSubmitting(false)
    }
  }

  if (leadSent) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-success)]">
        Mensagem enviada! Entraremos em contato em breve.
      </p>
    )
  }

  return (
    <form onSubmit={handleLead} className="space-y-3">
      <div>
        <Label htmlFor="lead-name">Nome</Label>
        <Input
          id="lead-name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="lead-email">E-mail</Label>
        <Input
          id="lead-email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="lead-phone">Telefone</Label>
        <Input
          id="lead-phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="lead-cat">Modalidade de interesse</Label>
        <select
          id="lead-cat"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
          value={form.categoryInterest}
          onChange={(e) => setForm({ ...form, categoryInterest: e.target.value })}
        >
          <option value="">Selecione</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="lead-msg">Mensagem</Label>
        <textarea
          id="lead-msg"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 py-2 text-sm"
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      {leadError ? <p className="text-sm text-[var(--color-danger)]">{leadError}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Enviar'}
      </Button>
    </form>
  )
}
