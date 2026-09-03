import { describe, expect, it } from 'vitest'
import { formatStudentStatus, studentStatusVariant } from './student-status'

describe('formatStudentStatus', () => {
  it('traduz TRIAL para Experimental', () => {
    expect(formatStudentStatus('TRIAL')).toBe('Experimental')
  })

  it('mantém status desconhecido', () => {
    expect(formatStudentStatus('FOO')).toBe('FOO')
  })
})

describe('studentStatusVariant', () => {
  it('usa warning para experimental', () => {
    expect(studentStatusVariant('TRIAL')).toBe('warning')
  })
})
