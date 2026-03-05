export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter no minimo 8 caracteres e incluir letra maiuscula, letra minuscula, numero e caractere especial.';

export function isStrongPassword(password: string): boolean {
  return PASSWORD_POLICY_REGEX.test(password);
}
