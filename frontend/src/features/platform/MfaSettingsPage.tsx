import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { supabase } from '../../lib/supabase'

export function MfaSettingsPage() {
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string; status: string }[]>([])
  const [qr, setQr] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp ?? [])
  }

  useEffect(() => {
    void loadFactors()
  }, [])

  async function startEnroll() {
    setLoading(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'RingPro Authenticator',
      })
      if (error) throw error
      setQr(data.totp?.qr_code ?? null)
      setFactorId(data.id)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao iniciar 2FA')
    } finally {
      setLoading(false)
    }
  }

  async function verifyEnroll() {
    if (!factorId || !code) return
    setLoading(true)
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId })
      if (chErr) throw chErr
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      })
      if (error) throw error
      setMessage('2FA ativado com sucesso.')
      setQr(null)
      setCode('')
      setFactorId(null)
      await loadFactors()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Código inválido')
    } finally {
      setLoading(false)
    }
  }

  async function unenroll(id: string) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
      if (error) throw error
      setMessage('2FA removido.')
      await loadFactors()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao remover')
    } finally {
      setLoading(false)
    }
  }

  const active = factors.filter((f) => f.status === 'verified')

  return (
    <div className="max-w-lg">
      <h2 className="mb-2 text-2xl font-semibold">Segurança — 2FA</h2>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Autenticação em dois fatores (TOTP) recomendada para PLATFORM_OWNER.
      </p>

      {active.length > 0 ? (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm font-medium text-[var(--color-success)]">2FA ativo</p>
          {active.map((f) => (
            <div key={f.id} className="mt-3 flex items-center justify-between">
              <span className="text-sm">{f.friendly_name ?? 'Authenticator'}</span>
              <Button variant="ghost" type="button" disabled={loading} onClick={() => void unenroll(f.id)}>
                Remover
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {!qr && active.length === 0 ? (
        <Button type="button" disabled={loading} onClick={() => void startEnroll()}>
          Configurar 2FA
        </Button>
      ) : null}

      {qr ? (
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
          <p className="text-sm">Escaneie o QR code no app autenticador:</p>
          <img src={qr} alt="QR Code 2FA" className="mx-auto h-48 w-48" />
          <div>
            <Label htmlFor="mfa-code">Código de verificação</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          </div>
          <Button type="button" disabled={loading || code.length < 6} onClick={() => void verifyEnroll()}>
            Confirmar 2FA
          </Button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">{message}</p> : null}
    </div>
  )
}
