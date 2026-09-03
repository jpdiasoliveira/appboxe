export const DEFAULT_FEATURE_FLAGS: { key: string; label: string; defaultEnabled: boolean }[] = [
  { key: 'module_payments_card', label: 'Pagamento cartão', defaultEnabled: true },
  { key: 'module_payments_pix', label: 'Pagamento PIX', defaultEnabled: true },
  { key: 'module_payments_boleto', label: 'Pagamento boleto', defaultEnabled: true },
  { key: 'module_attendance', label: 'Presença / chamada', defaultEnabled: true },
  { key: 'module_landing', label: 'Landing page pública', defaultEnabled: true },
  { key: 'module_trial', label: 'Período trial', defaultEnabled: false },
  { key: 'module_notifications_email', label: 'E-mails transacionais', defaultEnabled: true },
  { key: 'module_notifications_push', label: 'Push notifications (FCM)', defaultEnabled: false },
  { key: 'module_student_self_register', label: 'Cadastro público aluno', defaultEnabled: false },
  { key: 'module_class_schedule', label: 'Grade de horários', defaultEnabled: true },
  { key: 'module_student_documents', label: 'Documentos do aluno', defaultEnabled: false },
  { key: 'module_class_makeup', label: 'Reposição de aula', defaultEnabled: false },
  { key: 'module_class_groups', label: 'Turmas com roster fixo', defaultEnabled: false },
  { key: 'module_graduation', label: 'Graduação / faixas', defaultEnabled: false },
  { key: 'module_physical_assessment', label: 'Avaliação física periódica', defaultEnabled: false },
]

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
