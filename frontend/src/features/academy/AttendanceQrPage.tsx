import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Button } from '../../components/ui/Button'
import { FeedbackMessage } from '../../components/ui/FeedbackMessage'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { PageHeader } from '../../components/ui/PageHeader'
import { Select } from '../../components/ui/Select'
import { useAcademyContext } from '../../contexts/AcademyContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { buildStudentCheckInUrl } from '../../lib/attendance-qr-types'
import { fetchClassGroups } from './class-groups-api'
import { fetchCategories } from './academy-api'
import { createAttendanceQrSession, fetchActiveAttendanceQrSession } from './attendance-qr-api'

function QrCodeImage({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(value, { margin: 1, width: 240 }))
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  if (!dataUrl) {
    return (
      <div className="flex h-60 w-60 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        Gerando QR...
      </div>
    )
  }

  return <img src={dataUrl} alt="QR code de check-in" className="h-60 w-60 rounded-lg border border-[var(--color-border)]" />
}

export function AttendanceQrPage() {
  const { activeAcademyId } = useAcademyContext()
  const { enabled, loading } = useFeatureFlag(activeAcademyId, 'module_attendance')
  const { enabled: classGroupsEnabled } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [classGroups, setClassGroups] = useState<{ id: string; name: string; training_category_id: string }[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [classGroupId, setClassGroupId] = useState('')
  const [classDate, setClassDate] = useState(new Date().toISOString().slice(0, 10))
  const [token, setToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const checkInUrl = useMemo(() => (token ? buildStudentCheckInUrl(token) : ''), [token])

  useEffect(() => {
    if (!activeAcademyId) return
    fetchCategories(activeAcademyId).then(setCategories)
    if (classGroupsEnabled) {
      fetchClassGroups(activeAcademyId).then((rows) =>
        setClassGroups(
          rows.map((g) => ({
            id: g.id,
            name: g.name,
            training_category_id: g.training_category_id,
          })),
        ),
      )
    }
  }, [activeAcademyId, classGroupsEnabled])

  useEffect(() => {
    if (!activeAcademyId || !categoryId) return
    fetchActiveAttendanceQrSession({
      academyId: activeAcademyId,
      trainingCategoryId: categoryId,
      classDate,
      classGroupId: classGroupId || undefined,
    })
      .then((session) => {
        setToken(session?.token ?? null)
        setExpiresAt(session?.expires_at ?? null)
      })
      .catch((e: Error) => setError(e.message))
  }, [activeAcademyId, categoryId, classDate, classGroupId])

  if (!loading && !enabled) {
    return <Navigate to="/academy/dashboard" replace />
  }

  async function generateQr() {
    if (!categoryId) return
    setBusy(true)
    setError(null)
    try {
      const result = await createAttendanceQrSession({
        trainingCategoryId: categoryId,
        classDate,
        classGroupId: classGroupId || undefined,
      })
      setToken(result.token)
      setExpiresAt(result.expiresAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar QR')
    } finally {
      setBusy(false)
    }
  }

  async function copyUrl() {
    if (!checkInUrl) return
    await navigator.clipboard.writeText(checkInUrl)
  }

  return (
    <div>
      <PageHeader
        title="Check-in QR"
        description="Gere um QR para os alunos confirmarem presença pelo celular."
      />

      <p className="mb-4 text-sm">
        <Link to="/academy/presenca" className="text-[var(--color-primary)] hover:underline">
          Voltar para chamada manual
        </Link>
      </p>

      {error ? <FeedbackMessage variant="error" className="mb-4">{error}</FeedbackMessage> : null}

      <div className="mb-6 grid gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="qr-category">Modalidade</Label>
          <Select
            id="qr-category"
            className="mt-1"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setClassGroupId('')
              setToken(null)
            }}
          >
            <option value="">Selecione...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {classGroupsEnabled ? (
          <div>
            <Label htmlFor="qr-group">Turma fixa</Label>
            <Select
              id="qr-group"
              className="mt-1"
              value={classGroupId}
              onChange={(e) => {
                setClassGroupId(e.target.value)
                setToken(null)
              }}
            >
              <option value="">Todos da modalidade</option>
              {classGroups
                .filter((g) => g.training_category_id === categoryId)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </Select>
          </div>
        ) : null}

        <div>
          <Label htmlFor="qr-date">Data da aula</Label>
          <Input
            id="qr-date"
            type="date"
            className="mt-1"
            value={classDate}
            onChange={(e) => {
              setClassDate(e.target.value)
              setToken(null)
            }}
          />
        </div>

        <div className="flex items-end">
          <Button type="button" onClick={generateQr} disabled={!categoryId || busy} className="w-full sm:w-auto">
            <ArrowPathIcon className="mr-1.5 h-4 w-4" />
            {busy ? 'Gerando...' : token ? 'Gerar novo QR' : 'Gerar QR'}
          </Button>
        </div>
      </div>

      {token ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6">
          <QrCodeImage value={checkInUrl} />
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            Peça aos alunos para escanear o QR ou abrir o link no celular.
          </p>
          {expiresAt ? (
            <p className="text-xs text-[var(--color-text-muted)]">
              Válido até {new Date(expiresAt).toLocaleString('pt-BR')}
            </p>
          ) : null}
          <div className="w-full max-w-md break-all rounded-lg bg-[var(--color-bg-elevated)] p-3 text-center text-xs">
            {checkInUrl}
          </div>
          <Button type="button" variant="ghost" onClick={copyUrl}>
            Copiar link
          </Button>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">
          Selecione a modalidade e gere o QR para iniciar o check-in.
        </p>
      )}
    </div>
  )
}
