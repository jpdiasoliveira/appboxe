import { useEffect, useRef, useState } from 'react'
import { ArrowDownTrayIcon, DocumentIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/Button'
import { FeedbackMessage } from '../../../components/ui/FeedbackMessage'
import { Input } from '../../../components/ui/Input'
import { Label } from '../../../components/ui/Label'
import { getAcademyContractSignedUrl } from '../../../lib/academy-contract-storage'
import type { AcademyContractDocument } from '../../../lib/academy-contract-types'
import {
  fetchActiveAcademyContract,
  removeActiveAcademyContract,
  uploadAcademyContract,
} from '../academy-contract-api'

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface AcademyContractSectionProps {
  academyId: string
  isOwner: boolean
}

export function AcademyContractSection({ academyId, isOwner }: AcademyContractSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [contract, setContract] = useState<AcademyContractDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [title, setTitle] = useState('Contrato de matrícula')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchActiveAcademyContract(academyId)
      .then((row) => {
        setContract(row)
        if (row?.title) setTitle(row.title)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [academyId])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    setError(null)
    setSuccess(null)
    try {
      const row = await uploadAcademyContract({
        academyId,
        file: selectedFile,
        title,
      })
      setContract(row)
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccess('Contrato PDF atualizado.')
      setTimeout(() => setSuccess(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar contrato')
    } finally {
      setUploading(false)
    }
  }

  async function handlePreview() {
    if (!contract) return
    try {
      const url = await getAcademyContractSignedUrl(contract.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir contrato')
    }
  }

  async function handleRemove() {
    if (!contract) return
    if (!window.confirm('Remover o contrato PDF ativo? O link no convite de matrícula deixará de aparecer.')) {
      return
    }
    setRemoving(true)
    setError(null)
    try {
      await removeActiveAcademyContract(contract)
      setContract(null)
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover contrato')
    } finally {
      setRemoving(false)
    }
  }

  if (!isOwner) return null

  return (
    <div className="space-y-4 rounded-lg border border-[var(--color-border)] p-4">
      <div>
        <h4 className="text-sm font-semibold">Contrato PDF (matrícula)</h4>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          O arquivo ativo aparece como link no convite de matrícula do aluno.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Carregando...</p>
      ) : contract ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex min-w-0 items-start gap-3">
            <DocumentIcon className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-muted)]" aria-hidden />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{contract.title}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {contract.original_filename ?? 'contrato.pdf'} · {formatFileSize(contract.file_size_bytes)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void handlePreview()}>
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
              Abrir
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-xs"
              onClick={() => void handleRemove()}
              disabled={removing}
            >
              <TrashIcon className="h-4 w-4" aria-hidden />
              {removing ? 'Removendo...' : 'Remover'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">Nenhum contrato PDF cadastrado.</p>
      )}

      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <Label htmlFor="contract-title">Título exibido no convite</Label>
          <Input
            id="contract-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contrato de matrícula"
          />
        </div>
        <div>
          <Label htmlFor="contract-file">Arquivo PDF</Label>
          <input
            id="contract-file"
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="mt-1 block w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--color-bg-elevated)] file:px-3 file:py-2 file:text-sm file:font-medium"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">Máximo 10 MB. Substitui o contrato ativo.</p>
        </div>
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
        {success ? <FeedbackMessage variant="success">{success}</FeedbackMessage> : null}
        <Button type="submit" disabled={uploading || !selectedFile}>
          {uploading ? 'Enviando...' : contract ? 'Substituir contrato' : 'Enviar contrato'}
        </Button>
      </form>
    </div>
  )
}
