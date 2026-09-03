export function normalizeWhatsAppPhone(phone?: string | null): string | null {
  if (!phone?.trim()) return null
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export interface StudentInviteWhatsAppMessageInput {
  inviteLink: string
  academyName?: string
  recipientName?: string
}

export interface StaffInviteWhatsAppMessageInput {
  inviteLink: string
  academyName?: string
  role: 'PROFESSOR' | 'ASSISTANT'
}

export interface InvoiceReminderWhatsAppMessageInput {
  studentName: string
  academyName?: string
  amount: number
  dueDate: string
  overdue?: boolean
}

export function buildStudentInviteWhatsAppMessage(input: StudentInviteWhatsAppMessageInput): string {
  const academy = input.academyName?.trim() || 'nossa academia'
  const greeting = input.recipientName?.trim() ? `Olá, ${input.recipientName.trim()}!` : 'Olá!'

  return [
    greeting,
    '',
    `Você foi convidado(a) para concluir sua matrícula na ${academy} pelo RingPro.`,
    '',
    'Acesse o link abaixo para preencher seus dados e criar sua senha (válido por 7 dias):',
    input.inviteLink,
    '',
    'Qualquer dúvida, fale com a recepção da academia.',
  ].join('\n')
}

export function buildStaffInviteWhatsAppMessage(input: StaffInviteWhatsAppMessageInput): string {
  const academy = input.academyName?.trim() || 'nossa academia'
  const roleLabel = input.role === 'PROFESSOR' ? 'professor(a)' : 'sub-professor(a)'

  return [
    'Olá!',
    '',
    `Você foi convidado(a) para integrar a equipe da ${academy} como ${roleLabel} no RingPro.`,
    '',
    'Acesse o link abaixo para criar sua conta (válido por 7 dias):',
    input.inviteLink,
    '',
    'Qualquer dúvida, fale com o dono da academia.',
  ].join('\n')
}

function formatDueDateLabel(dueDate: string): string {
  const [year, month, day] = dueDate.split('-')
  if (!year || !month || !day) return dueDate
  return `${day}/${month}/${year}`
}

function formatCurrencyBrl(amount: number): string {
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function buildInvoiceReminderWhatsAppMessage(input: InvoiceReminderWhatsAppMessageInput): string {
  const academy = input.academyName?.trim() || 'sua academia'
  const greeting = input.studentName.trim() ? `Olá, ${input.studentName.trim()}!` : 'Olá!'
  const dueLabel = formatDueDateLabel(input.dueDate)
  const amountLabel = formatCurrencyBrl(input.amount)
  const urgency = input.overdue
    ? `Sua mensalidade de ${amountLabel} está em atraso (vencimento ${dueLabel}).`
    : `Lembramos que sua mensalidade de ${amountLabel} vence em ${dueLabel}.`

  return [
    greeting,
    '',
    urgency,
    '',
    `Acesse o portal do aluno da ${academy} para regularizar o pagamento.`,
    '',
    'Qualquer dúvida, fale com a recepção da academia.',
  ].join('\n')
}

export function buildWhatsAppInviteUrl(phone: string | null | undefined, message: string): string {
  const encoded = encodeURIComponent(message)
  const normalized = normalizeWhatsAppPhone(phone)
  if (normalized) {
    return `https://wa.me/${normalized}?text=${encoded}`
  }
  return `https://wa.me/?text=${encoded}`
}

export function openWhatsAppInvite(phone: string | null | undefined, message: string): void {
  window.open(buildWhatsAppInviteUrl(phone, message), '_blank', 'noopener,noreferrer')
}
