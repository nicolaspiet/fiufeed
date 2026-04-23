const AUTH_MESSAGES: Record<string, string> = {
  over_email_send_rate_limit: 'Muitas tentativas de envio de e-mail. Aguarde alguns minutos e tente novamente.',
  email_address_not_authorized: 'Este endereço de e-mail não está autorizado. Tente com outro ou use o Google.',
  user_already_exists: 'Já existe uma conta com este e-mail. Tente entrar.',
  email_exists: 'Já existe uma conta com este e-mail. Tente entrar.',
  invalid_credentials: 'E-mail ou senha incorretos.',
  invalid_login_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
  user_not_found: 'E-mail ou senha incorretos.',
  weak_password: 'Senha muito fraca. Use pelo menos 8 caracteres com letras e números.',
  same_password: 'A nova senha não pode ser igual à atual.',
  otp_expired: 'O link expirou. Solicite um novo.',
  flow_state_not_found: 'Sessão expirada. Tente novamente.',
  flow_state_expired: 'Sessão expirada. Tente novamente.',
  provider_disabled: 'Este método de login não está disponível no momento.',
  provider_email_needs_verification: 'Verifique seu e-mail para continuar.',
  signup_disabled: 'Novos cadastros estão temporariamente desativados.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  session_not_found: 'Sessão não encontrada. Faça login novamente.',
  auth_failed: 'Falha na autenticação. Tente novamente.',
  no_code: 'Link inválido. Tente fazer login novamente.',
}

const DB_MESSAGES: Record<string, string> = {
  '23505': 'Já existe um registro com esses dados.',
  '23503': 'Operação inválida: referência não encontrada.',
  '42501': 'Você não tem permissão para realizar essa ação.',
  PGRST301: 'Você não tem permissão para realizar essa ação.',
  PGRST116: 'Nenhum registro encontrado.',
}

export function getAuthErrorMessage(message: string, code?: string): string {
  if (code && AUTH_MESSAGES[code]) return AUTH_MESSAGES[code]

  const lower = message.toLowerCase()
  if (lower.includes('rate limit')) return AUTH_MESSAGES.over_request_rate_limit
  if (lower.includes('invalid') && lower.includes('credential')) return AUTH_MESSAGES.invalid_credentials
  if (lower.includes('email') && lower.includes('confirm')) return AUTH_MESSAGES.email_not_confirmed
  if (lower.includes('already registered') || lower.includes('already exists')) return AUTH_MESSAGES.user_already_exists

  return 'Algo deu errado. Tente novamente.'
}

export function getDbErrorMessage(message: string, code?: string): string {
  if (code && DB_MESSAGES[code]) return DB_MESSAGES[code]

  const lower = message.toLowerCase()
  if (lower.includes('permission') || lower.includes('policy')) return DB_MESSAGES['42501']
  if (lower.includes('duplicate') || lower.includes('unique')) return DB_MESSAGES['23505']

  return 'Algo deu errado. Tente novamente.'
}

export function getCallbackErrorMessage(errorCode: string): string {
  return AUTH_MESSAGES[errorCode] ?? 'Algo deu errado na autenticação. Tente novamente.'
}
