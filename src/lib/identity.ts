export type ContactChannel = 'email' | 'phone'

export type IdentifierKind = 'email' | 'phone' | 'login'

const LOGIN_RE = /^[a-z0-9._-]+$/
const HAS_LETTER_RE = /[a-z]/
const DIGITS_ONLY_RE = /^\d+$/

export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  return value.trim()
}

export function isValidLogin(value: string): boolean {
  const login = normalizeLogin(value)
  if (login.length < 3 || login.length > 32) return false
  if (login.includes('@')) return false
  if (!LOGIN_RE.test(login)) return false
  return HAS_LETTER_RE.test(login)
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value)
  const at = email.indexOf('@')
  if (at <= 0) return false
  if (at !== email.lastIndexOf('@')) return false
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  return local.length > 0 && domain.length > 0
}

export function isValidPhone(value: string): boolean {
  const phone = normalizePhone(value)
  if (!DIGITS_ONLY_RE.test(phone)) return false
  return phone.length >= 10 && phone.length <= 15
}

export function classifyIdentifier(value: string): IdentifierKind {
  const trimmed = value.trim()
  if (trimmed.includes('@')) return 'email'
  if (DIGITS_ONLY_RE.test(trimmed)) return 'phone'
  return 'login'
}

export function loginErrorMessage(value: string): string | null {
  const login = normalizeLogin(value)
  if (!login) return 'Введите логин.'
  if (login.includes('@')) return 'Логин не может содержать @.'
  if (login.length < 3 || login.length > 32) {
    return 'Логин: от 3 до 32 символов.'
  }
  if (!LOGIN_RE.test(login)) {
    return 'Логин: латиница в нижнем регистре, цифры и символы . _ -.'
  }
  if (!HAS_LETTER_RE.test(login)) {
    return 'В логине нужна хотя бы одна буква a–z.'
  }
  return null
}

export function emailErrorMessage(value: string): string | null {
  const email = value.trim()
  if (!email) return null
  if (!isValidEmail(email)) {
    return 'Введите почту вида name@example.com.'
  }
  return null
}

export function phoneErrorMessage(value: string): string | null {
  const phone = value.trim()
  if (!phone) return null
  if (!isValidPhone(phone)) {
    return 'Телефон: только цифры, длина от 10 до 15.'
  }
  return null
}
