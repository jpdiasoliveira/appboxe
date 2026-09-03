import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Label } from '../../components/ui/Label'
import { useStudentContext } from '../../contexts/StudentContext'
import { useFeatureFlag } from '../../hooks/useFeatureFlag'
import { isPaymentsMock } from '../../lib/payments'
import type { ChargeResult } from '../../lib/payments/types'
import type { StudentInvoice } from '../../lib/student-types'
import { PaymentChargePanel } from './components/PaymentChargePanel'
import {
  createPaymentCharge,
  fetchPaymentMethods,
  fetchStudentDashboard,
  savePaymentMethod,
  simulatePayment,
} from './student-api'

const IS_DEV = import.meta.env.DEV
const PAYMENTS_MOCK = isPaymentsMock()

export function PaymentPage() {
  const { student, refresh } = useStudentContext()
  const { enabled: pixEnabled } = useFeatureFlag(student?.academy_id ?? null, 'module_payments_pix')
  const { enabled: boletoEnabled } = useFeatureFlag(student?.academy_id ?? null, 'module_payments_boleto')
  const [invoice, setInvoice] = useState<StudentInvoice | null>(null)
  const [methods, setMethods] = useState<{ brand: string | null; last_four: string | null }[]>([])
  const [cardLast4, setCardLast4] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardExp, setCardExp] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [paymentCharge, setPaymentCharge] = useState<ChargeResult | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!student) return
    fetchStudentDashboard(student.id).then((d) => setInvoice(d.pendingInvoice))
    fetchPaymentMethods(student.id).then(setMethods)
  }, [student])

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    if (!student) return
    setLoading(true)
    try {
      if (PAYMENTS_MOCK) {
        if (cardLast4.length !== 4) return
        await savePaymentMethod(student.id, { lastFour: cardLast4 })
      } else {
        const [expMonthRaw, expYearRaw] = cardExp.split('/')
        const expMonth = Number(expMonthRaw)
        const expYear = Number(expYearRaw?.length === 2 ? `20${expYearRaw}` : expYearRaw)
        await savePaymentMethod(student.id, {
          number: cardNumber.replace(/\D/g, ''),
          holderName: cardHolder.trim(),
          expMonth,
          expYear,
          cvv: cardCvv,
        })
      }
      setMessage(
        PAYMENTS_MOCK
          ? 'Cartão tokenizado (mock).'
          : 'Cartão tokenizado via Pagar.me.',
      )
      fetchPaymentMethods(student.id).then(setMethods)
      setCardLast4('')
      setCardNumber('')
      setCardHolder('')
      setCardExp('')
      setCardCvv('')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function handlePix() {
    if (!invoice) return
    setLoading(true)
    setPaymentCharge(null)
    try {
      const res = await createPaymentCharge(invoice.id, 'PIX')
      setPaymentCharge(res)
      setMessage(res.message)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function handleBoleto() {
    if (!invoice) return
    setLoading(true)
    setPaymentCharge(null)
    try {
      const res = await createPaymentCharge(invoice.id, 'BOLETO')
      setPaymentCharge(res)
      setMessage(res.message)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  async function handleSimulate() {
    if (!invoice) return
    setLoading(true)
    try {
      await simulatePayment(invoice.id)
      setMessage('Pagamento confirmado! Status atualizado para ATIVO.')
      setInvoice(null)
      await refresh()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 text-2xl font-semibold">Pagamento</h2>
      <p className="mb-4 text-xs text-[var(--color-text-muted)]">
        Apenas o aluno cadastra forma de pagamento (PCI). Professor nunca coleta cartão.
      </p>

      {invoice ? (
        <div className="mb-6 rounded-xl border border-[var(--color-border)] p-4">
          <p className="font-medium">Fatura pendente</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">
            {Number(invoice.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">Vencimento: {invoice.due_date}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {pixEnabled ? (
              <Button type="button" disabled={loading} onClick={handlePix}>
                Gerar PIX
              </Button>
            ) : null}
            {boletoEnabled ? (
              <Button type="button" variant="ghost" disabled={loading} onClick={handleBoleto}>
                Gerar boleto
              </Button>
            ) : null}
            {IS_DEV ? (
              <Button type="button" variant="ghost" disabled={loading} onClick={handleSimulate}>
                Simular pagamento (dev)
              </Button>
            ) : null}
          </div>
          {paymentCharge ? <PaymentChargePanel charge={paymentCharge} /> : null}
        </div>
      ) : (
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">Nenhuma fatura pendente.</p>
      )}

      <h3 className="mb-3 font-semibold">Cartão recorrente</h3>
      {methods.length > 0 ? (
        <p className="mb-4 text-sm">
          {methods[0].brand ?? 'Cartão'} ·••• {methods[0].last_four}
        </p>
      ) : null}

      <form onSubmit={handleSaveCard} className="space-y-3">
        {PAYMENTS_MOCK ? (
          <div>
            <Label htmlFor="last4">Últimos 4 dígitos (mock token)</Label>
            <Input
              id="last4"
              maxLength={4}
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
              placeholder="1234"
            />
          </div>
        ) : (
          <>
            <div>
              <Label htmlFor="card-number">Número do cartão</Label>
              <Input
                id="card-number"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>
            <div>
              <Label htmlFor="card-holder">Nome no cartão</Label>
              <Input
                id="card-holder"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Como impresso no cartão"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-exp">Validade (MM/AA)</Label>
                <Input
                  id="card-exp"
                  value={cardExp}
                  onChange={(e) => setCardExp(e.target.value.replace(/[^\d/]/g, ''))}
                  placeholder="12/30"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="card-cvv">CVV</Label>
                <Input
                  id="card-cvv"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  maxLength={4}
                />
              </div>
            </div>
          </>
        )}
        <Button
          type="submit"
          disabled={
            loading ||
            (PAYMENTS_MOCK
              ? cardLast4.length !== 4
              : !cardNumber || !cardHolder || !cardExp || cardCvv.length < 3)
          }
        >
          Salvar cartão tokenizado
        </Button>
      </form>

      {message ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">{message}</p> : null}
    </div>
  )
}
