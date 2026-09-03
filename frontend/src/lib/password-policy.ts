export const MIN_PASSWORD_LENGTH = 6

export const PASSWORD_MIN_LENGTH_MESSAGE = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`

export function isPasswordLongEnough(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function validatePasswordPair(password: string, confirm: string): string | null {
  if (!isPasswordLongEnough(password)) return PASSWORD_MIN_LENGTH_MESSAGE
  if (password !== confirm) return 'As senhas não conferem.'
  return null
}
