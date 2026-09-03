import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import type { ChargeResult } from '../../../lib/payments/types'
import { chargeCopyLabel, copyChargeCode, resolvePixQrImageSrc } from '../../../lib/payments/charge-display'

function PixQrImage({ charge }: { charge: ChargeResult }) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(false)
    setSrc(null)
    void resolvePixQrImageSrc(charge)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [charge.copyPaste, charge.qrCodeUrl])

  if (error) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Não foi possível gerar o QR. Use o código copia e cola abaixo.
      </p>
    )
  }

  if (!src) {
    return (
      <div className="flex h-60 w-60 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
        Gerando QR...
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="QR Code PIX"
      width={240}
      height={240}
      className="rounded-lg border border-[var(--color-border)] bg-white p-2"
    />
  )
}

type PaymentChargePanelProps = {
  charge: ChargeResult
}

export function PaymentChargePanel({ charge }: PaymentChargePanelProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await copyChargeCode(charge.copyPaste)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-4">
      {charge.method === 'PIX' ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <PixQrImage charge={charge} />
          <div className="w-full flex-1 space-y-2">
            <p className="text-sm font-medium">Escaneie o QR ou copie o código PIX</p>
            <p className="break-all font-mono text-xs text-[var(--color-text-muted)]">{charge.copyPaste}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">Linha digitável do boleto</p>
          <p className="break-all font-mono text-xs text-[var(--color-text-muted)]">{charge.copyPaste}</p>
          {charge.barcode ? (
            <p className="break-all text-xs text-[var(--color-text-muted)]">Código de barras: {charge.barcode}</p>
          ) : null}
          {charge.boletoUrl ? (
            <a
              href={charge.boletoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm font-medium text-[var(--color-primary)] underline"
            >
              Abrir boleto em PDF
            </a>
          ) : null}
        </div>
      )}

      <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => void handleCopy()}>
        {copied ? 'Copiado!' : `Copiar ${chargeCopyLabel(charge)}`}
      </Button>

      {charge.message ? (
        <p className="text-xs text-[var(--color-text-muted)]">{charge.message}</p>
      ) : null}
    </div>
  )
}
