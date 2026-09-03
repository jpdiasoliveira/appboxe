import type { StudentRow } from '../../lib/academy-types'
import { formatPhoneBR } from '../../lib/phone-utils'
import type { StudentStatus } from '../../lib/types'

export function studentDisplayName(row: StudentRow): string {
  const p = row.profile
  if (!p) return '—'
  if (Array.isArray(p)) return p[0]?.name ?? '—'
  return p.name
}

export interface StudentEditFields {
  name: string
  cpf: string
  phone: string
  status: StudentStatus
  birthDate: string
  weightKg: string
  heightCm: string
  emergencyName: string
  emergencyPhone: string
  fightsCount: string
  sparringSessions: string
  trainingStartedAt: string
  inactiveReason: string
}

export const EMPTY_STUDENT_EDIT_FIELDS: StudentEditFields = {
  name: '',
  cpf: '',
  phone: '',
  status: 'ATIVO',
  birthDate: '',
  weightKg: '',
  heightCm: '',
  emergencyName: '',
  emergencyPhone: '',
  fightsCount: '0',
  sparringSessions: '0',
  trainingStartedAt: '',
  inactiveReason: '',
}

export function fieldsFromStudentRow(row: StudentRow): StudentEditFields {
  const name = studentDisplayName(row)
  return {
    name: name === '—' ? '' : name,
    cpf: row.cpf ?? '',
    phone: formatPhoneBR(row.phone ?? ''),
    status: row.status,
    birthDate: row.birth_date ?? '',
    weightKg: row.weight_kg != null ? String(row.weight_kg) : '',
    heightCm: row.height_cm != null ? String(row.height_cm) : '',
    emergencyName: row.emergency_contact_name ?? '',
    emergencyPhone: formatPhoneBR(row.emergency_contact_phone ?? ''),
    fightsCount: String(row.fights_count ?? 0),
    sparringSessions: String(row.sparring_sessions ?? 0),
    trainingStartedAt: row.training_started_at ?? '',
    inactiveReason: row.inactive_reason ?? '',
  }
}

export function fieldsFromEditData(
  student: StudentRow & { profile_name: string },
): StudentEditFields {
  return {
    name: student.profile_name === '—' ? '' : student.profile_name,
    cpf: student.cpf ?? '',
    phone: formatPhoneBR(student.phone ?? ''),
    status: student.status,
    birthDate: student.birth_date ?? '',
    weightKg: student.weight_kg != null ? String(student.weight_kg) : '',
    heightCm: student.height_cm != null ? String(student.height_cm) : '',
    emergencyName: student.emergency_contact_name ?? '',
    emergencyPhone: formatPhoneBR(student.emergency_contact_phone ?? ''),
    fightsCount: String(student.fights_count ?? 0),
    sparringSessions: String(student.sparring_sessions ?? 0),
    trainingStartedAt: student.training_started_at ?? '',
    inactiveReason: student.inactive_reason ?? '',
  }
}
