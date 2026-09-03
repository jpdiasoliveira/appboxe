import { useEffect, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { ResponsiveDataList, type DataColumn } from '../../components/ui/ResponsiveDataList'
import { useAcademyContext } from '../../contexts/AcademyContext'
import type { AcademyBranchRow } from './academy-api'
import { fetchAcademyBranches, upsertAcademyBranch } from './academy-api'

export function BranchesPage() {
  const { activeAcademyId } = useAcademyContext()
  const [rows, setRows] = useState<AcademyBranchRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  function reload() {
    if (!activeAcademyId) return
    fetchAcademyBranches(activeAcademyId)
      .then(setRows)
      .catch((e: Error) => setError(e.message))
  }

  useEffect(() => {
    reload()
  }, [activeAcademyId])

  const columns: DataColumn<AcademyBranchRow>[] = [
    {
      id: 'name',
      header: 'Unidade',
      primary: true,
      render: (row) => row.name,
    },
    {
      id: 'slug',
      header: 'Slug',
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.slug,
    },
    {
      id: 'address',
      header: 'Endereço',
      hideOnMobile: true,
      cellClassName: 'text-[var(--color-text-muted)]',
      render: (row) => row.address ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.status === 'ATIVO' ? 'success' : 'muted'}>{row.status}</Badge>
      ),
    },
  ]

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!activeAcademyId || !name.trim() || !slug.trim()) return
    setSaving(true)
    setError(null)
    try {
      await upsertAcademyBranch(activeAcademyId, {
        name,
        slug,
        address: address || null,
      })
      setName('')
      setSlug('')
      setAddress('')
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar filial')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Filiais" />

      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Cadastre unidades da academia. No MVP o faturamento permanece unificado na matriz.
      </p>

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      <form onSubmit={(e) => void handleAdd(e)} className="mb-6 grid gap-4 rounded-xl border border-[var(--color-border)] p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="branch-name">Nome da unidade</Label>
          <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="branch-slug">Slug interno</Label>
          <Input
            id="branch-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="centro"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="branch-address">Endereço</Label>
          <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar filial'}
          </Button>
        </div>
      </form>

      <ResponsiveDataList
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage="Nenhuma filial cadastrada."
      />
    </div>
  )
}
