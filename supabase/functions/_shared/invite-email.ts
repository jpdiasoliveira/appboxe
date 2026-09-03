export type InviteEmailMode = 'sent' | 'stub' | 'skipped'

export interface StudentInviteEmailInput {
  toEmail: string
  academyName: string
  inviteUrl: string
  expiresAt: string
}

export interface StaffInviteEmailInput {
  toEmail: string
  academyName: string
  inviteUrl: string
  expiresAt: string
  role: 'PROFESSOR' | 'ASSISTANT'
}

export interface InviteEmailResult {
  mode: InviteEmailMode
  message?: string
}

function formatExpiresPtBr(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export function buildStudentInviteEmail(input: StudentInviteEmailInput): {
  subject: string
  html: string
  text: string
} {
  const expiresLabel = formatExpiresPtBr(input.expiresAt)
  const subject = `${input.academyName} — complete sua matrícula no RingPro`

  const text = [
    `Olá!`,
    ``,
    `A academia ${input.academyName} convidou você para concluir sua matrícula no RingPro.`,
    ``,
    `Acesse o link abaixo para preencher seus dados e criar sua senha:`,
    input.inviteUrl,
    ``,
    `Este link é válido até ${expiresLabel}.`,
    ``,
    `Se você não esperava este convite, ignore este e-mail.`,
    ``,
    `— RingPro`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <p>Olá!</p>
  <p>A academia <strong>${escapeHtml(input.academyName)}</strong> convidou você para concluir sua matrícula no <strong>RingPro</strong>.</p>
  <p style="margin:28px 0">
    <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
      Completar matrícula
    </a>
  </p>
  <p style="font-size:14px;color:#555">Ou copie o link: <a href="${escapeHtml(input.inviteUrl)}">${escapeHtml(input.inviteUrl)}</a></p>
  <p style="font-size:14px;color:#555">Válido até <strong>${escapeHtml(expiresLabel)}</strong>.</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
  <p style="font-size:12px;color:#888">Se você não esperava este convite, ignore este e-mail.</p>
</body>
</html>`

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const STAFF_ROLE_LABEL: Record<'PROFESSOR' | 'ASSISTANT', string> = {
  PROFESSOR: 'professor(a)',
  ASSISTANT: 'sub-professor(a)',
}

export function buildStaffInviteEmail(input: StaffInviteEmailInput): {
  subject: string
  html: string
  text: string
} {
  const expiresLabel = formatExpiresPtBr(input.expiresAt)
  const roleLabel = STAFF_ROLE_LABEL[input.role]
  const subject = `${input.academyName} — convite para equipe no RingPro`

  const text = [
    `Olá!`,
    ``,
    `A academia ${input.academyName} convidou você para entrar como ${roleLabel} no RingPro.`,
    ``,
    `Acesse o link abaixo para criar sua conta:`,
    input.inviteUrl,
    ``,
    `Este link é válido até ${expiresLabel}.`,
    ``,
    `Se você não esperava este convite, ignore este e-mail.`,
    ``,
    `— RingPro`,
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
  <p>Olá!</p>
  <p>A academia <strong>${escapeHtml(input.academyName)}</strong> convidou você para entrar como <strong>${escapeHtml(roleLabel)}</strong> no <strong>RingPro</strong>.</p>
  <p style="margin:28px 0">
    <a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
      Aceitar convite
    </a>
  </p>
  <p style="font-size:14px;color:#555">Ou copie o link: <a href="${escapeHtml(input.inviteUrl)}">${escapeHtml(input.inviteUrl)}</a></p>
  <p style="font-size:14px;color:#555">Válido até <strong>${escapeHtml(expiresLabel)}</strong>.</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
  <p style="font-size:12px;color:#888">Se você não esperava este convite, ignore este e-mail.</p>
</body>
</html>`

  return { subject, html, text }
}

async function sendInviteEmailViaResend(
  toEmail: string,
  subject: string,
  html: string,
  text: string,
): Promise<InviteEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'RingPro <onboarding@resend.dev>'

  if (!apiKey) {
    console.log('[invite-email:stub]', { to: toEmail, subject, text })
    return {
      mode: 'stub',
      message: 'RESEND_API_KEY não configurada — e-mail registrado no log da função',
    }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [toEmail],
      subject,
      html,
      text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend ${res.status}: ${body}`)
  }

  return { mode: 'sent' }
}

export async function sendStudentInviteEmail(
  input: StudentInviteEmailInput,
): Promise<InviteEmailResult> {
  const { subject, html, text } = buildStudentInviteEmail(input)
  return sendInviteEmailViaResend(input.toEmail, subject, html, text)
}

export async function sendStaffInviteEmail(
  input: StaffInviteEmailInput,
): Promise<InviteEmailResult> {
  const { subject, html, text } = buildStaffInviteEmail(input)
  return sendInviteEmailViaResend(input.toEmail, subject, html, text)
}

export function resolveInviteBaseUrl(inviteBaseUrl?: string): string {
  const fromBody = inviteBaseUrl?.trim().replace(/\/$/, '')
  if (fromBody) return fromBody
  const fromEnv = Deno.env.get('APP_PUBLIC_URL')?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return 'http://localhost:5173'
}
