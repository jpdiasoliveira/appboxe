import { describe, expect, it } from 'vitest'
import { validateAcademyContractFile } from './academy-contract-storage'

describe('validateAcademyContractFile', () => {
  it('aceita PDF válido', () => {
    const file = new File(['%PDF'], 'contrato.pdf', { type: 'application/pdf' })
    expect(() => validateAcademyContractFile(file)).not.toThrow()
  })

  it('rejeita formato inválido', () => {
    const file = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    expect(() => validateAcademyContractFile(file)).toThrow('Envie um arquivo PDF.')
  })
})
