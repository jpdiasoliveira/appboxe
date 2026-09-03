import DOMPurify from 'dompurify'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PhoneInput } from '../../components/ui/PhoneInput'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { Label } from '../../components/ui/Label'
import { LandingLayout } from '../../layouts/LandingLayout'
import { supabase } from '../../lib/supabase'
import { MIN_PASSWORD_LENGTH, validatePasswordPair } from '../../lib/password-policy'
import { completeStudentInvite, fetchInviteContractUrl, fetchPublicInvite, type PublicInviteInfo } from './invite-api'

export function StudentInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [info, setInfo] = useState<PublicInviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [name, setName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [openingContract, setOpeningContract] = useState(false)

  useEffect(() => {
    if (!token) return
    fetchPublicInvite(token)
      .then((data) => {
        setInfo(data)
        if (data.prefill_name) setName(data.prefill_name)
        if (data.email) setStudentEmail(data.email)
      })
      .catch(() => setInfo({ valid: false, reason: 'NOT_FOUND' }))
      .finally(() => setLoading(false))
  }, [token])

  async function handleOpenContract() {
    if (!token) return
    setOpeningContract(true)
    setError(null)
    try {
      const url = await fetchInviteContractUrl(token)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível abrir o contrato')
    } finally {
      setOpeningContract(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !info?.valid) return
    if (!studentEmail.trim()) {
      setError('Informe seu e-mail para criar o acesso.')
      return
    }
    const passwordError = validatePasswordPair(password, passwordConfirm)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (info.term && !acceptedTerms) {
      setError('É necessário aceitar o termo de matrícula para continuar.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await completeStudentInvite({
        token,
        email: studentEmail || undefined,
        name: name.trim() || undefined,
        password,
        cpf: cpf || undefined,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        emergencyContactName: emergencyName || undefined,
        emergencyContactPhone: emergencyPhone || undefined,
        acceptedTermId: info.term?.id,
      })

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      })
      if (signInErr) {
        setDone(true)
        return
      }
      navigate('/student/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir cadastro')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <LandingLayout>
        <p className="p-8 text-center text-[var(--color-text-muted)]">Carregando convite...</p>
      </LandingLayout>
    )
  }

  if (!info?.valid) {
    const msg =
      info?.reason === 'EXPIRED'
        ? 'Este link expirou. Peça um novo convite à academia.'
        : info?.reason === 'ALREADY_USED'
          ? 'Este link já foi utilizado.'
          : 'Convite inválido ou não encontrado.'
    return (
      <LandingLayout academyName={info?.academy_name}>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">{msg}</h1>
          <Link to="/login" className="mt-6 inline-block text-[var(--color-primary)] hover:underline">
            Ir para login
          </Link>
        </div>
      </LandingLayout>
    )
  }

  if (done) {
    return (
      <LandingLayout academyName={info.academy_name}>
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-semibold text-[var(--color-success)]">Cadastro concluído!</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Faça login para continuar.</p>
          <Link to="/login" className="mt-6 inline-block">
            <Button>Entrar</Button>
          </Link>
        </div>
      </LandingLayout>
    )
  }

  return (
    <LandingLayout academyName={info.academy_name}>
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-semibold">Complete sua matrícula</h1>
        <p className="mb-8 text-sm text-[var(--color-text-muted)]">
          {info.academy_name} — preencha seus dados para criar sua conta no portal do aluno.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Dados pessoais</legend>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                readOnly={Boolean(info.email)}
                required
              />
              {info.email ? (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  E-mail definido pelo convite da academia.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" />
            </div>
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <PhoneInput id="phone" value={phone} onChange={setPhone} />
            </div>
            <div>
              <Label htmlFor="birth">Data de nascimento</Label>
              <Input id="birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Dados físicos (opcional)</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="75"
                />
              </div>
              <div>
                <Label htmlFor="height">Altura (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  min="100"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Contato de emergência</legend>
            <div>
              <Label htmlFor="em-name">Nome</Label>
              <Input id="em-name" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="em-phone">Telefone</Label>
              <PhoneInput id="em-phone" value={emergencyPhone} onChange={setEmergencyPhone} />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <legend className="px-2 text-sm font-semibold">Acesso ao portal</legend>
            <div>
              <Label htmlFor="password">Senha *</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres
              </p>
            </div>
            <div>
              <Label htmlFor="password2">Confirmar senha *</Label>
              <PasswordInput
                id="password2"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>
          </fieldset>

          {info.contract ? (
            <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <legend className="px-2 text-sm font-semibold">{info.contract.title}</legend>
              <p className="text-sm text-[var(--color-text-muted)]">
                {info.contract.original_filename ?? 'contrato.pdf'} — leia o documento antes de concluir a matrícula.
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleOpenContract()}
                disabled={openingContract}
              >
                {openingContract ? 'Abrindo...' : 'Abrir contrato (PDF)'}
              </Button>
            </fieldset>
          ) : null}

          {info.term ? (
            <fieldset className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <legend className="px-2 text-sm font-semibold">{info.term.title}</legend>
              <div
                className="max-h-48 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-text-muted)]"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(info.term.content_html, {
                    ALLOWED_TAGS: [
                      'p', 'b', 'strong', 'i', 'em', 'u', 's',
                      'ul', 'ol', 'li', 'br', 'span', 'h1', 'h2', 'h3', 'h4', 'blockquote'
                    ],
                    ALLOWED_ATTR: ['class'],
                  }),
                }}
              />
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span>
                  Li e aceito o {info.term.title} (versão {info.term.version})
                </span>
              </label>
            </fieldset>
          ) : null}

          {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

          <Button
            type="submit"
            fullWidth
            disabled={submitting || (Boolean(info.term) && !acceptedTerms)}
          >
            {submitting ? 'Salvando...' : 'Concluir matrícula'}
          </Button>

          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Depois você poderá escolher plano, modalidades e forma de pagamento no portal do aluno.
          </p>
        </form>
      </div>
    </LandingLayout>
  )
}