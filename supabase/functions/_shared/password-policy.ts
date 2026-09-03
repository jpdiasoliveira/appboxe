export const MIN_PASSWORD_LENGTH = 6

export function validatePassword(password: string): string | null {
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`
  }
  return null
}
