export const PASSWORD_POLICY_HINT =
  'Use no minimo 8 caracteres com letra maiuscula, letra minuscula, numero e caractere especial.'

export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no minimo 8 caracteres e incluir letra maiuscula, letra minuscula, numero e caractere especial.'

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export function isPasswordPolicyValid(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password)
}

export function getPasswordPolicyError(password: string): string {
  if (!password) return ''
  return isPasswordPolicyValid(password) ? '' : PASSWORD_POLICY_MESSAGE
}
