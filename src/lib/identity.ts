export type ContactChannel = 'email' | 'phone'

export type IdentifierKind = 'email' | 'phone' | 'login'

export type RecoveryChannelHint = {
  channel: ContactChannel
  hint: string
}

export type RecoveryLookupResult =
  | { found: false }
  | {
      found: true
      via: IdentifierKind
      channel: ContactChannel
      channels: RecoveryChannelHint[]
    }

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

export function maskEmail(email: string): string {
  const normalized = normalizeEmail(email)
  const at = normalized.indexOf('@')
  if (at <= 0) return normalized
  const local = normalized.slice(0, at)
  const domain = normalized.slice(at + 1)
  if (local.length <= 2) return `${local}@${domain}`
  const middle = '*'.repeat(local.length - 2)
  return `${local[0]}${middle}${local[local.length - 1]}@${domain}`
}

export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length <= 4) return digits
  const visible = digits.slice(-4)
  return `${'*'.repeat(digits.length - 4)}${visible}`
}

type StubAccount = {
  login: string
  email: string | null
  phone: string | null
}

/** Local recovery directory shaped like POST /api/auth/recovery. */
const RECOVERY_STUBS: StubAccount[] = [
  {
    login: 'ann',
    email: 'narseev@gmail.com',
    phone: '79001234567',
  },
  {
    login: 'mail',
    email: 'abc@x.com',
    phone: null,
  },
  {
    login: 'tel',
    email: null,
    phone: '79001234567',
  },
]

function findStubByLogin(login: string): StubAccount | undefined {
  const normalized = normalizeLogin(login)
  return RECOVERY_STUBS.find((account) => account.login === normalized)
}

function findStubByEmail(email: string): StubAccount | undefined {
  const normalized = normalizeEmail(email)
  return RECOVERY_STUBS.find(
    (account) => account.email !== null && normalizeEmail(account.email) === normalized,
  )
}

function findStubByPhone(phone: string): StubAccount | undefined {
  const normalized = normalizePhone(phone)
  return RECOVERY_STUBS.find(
    (account) => account.phone !== null && account.phone === normalized,
  )
}

function channelsForLogin(account: StubAccount): RecoveryChannelHint[] {
  const channels: RecoveryChannelHint[] = []
  if (account.email) {
    channels.push({ channel: 'email', hint: maskEmail(account.email) })
  }
  if (account.phone) {
    channels.push({ channel: 'phone', hint: maskPhone(account.phone) })
  }
  return channels
}

export function lookupRecovery(identifier: string): RecoveryLookupResult {
  const kind = classifyIdentifier(identifier)
  const raw = identifier.trim()

  if (kind === 'login') {
    const account = findStubByLogin(raw)
    if (!account) return { found: false }
    const channels = channelsForLogin(account)
    if (channels.length === 0) return { found: false }
    const channel = channels[0].channel
    return { found: true, via: 'login', channel, channels }
  }

  if (kind === 'email') {
    const account = findStubByEmail(raw)
    if (!account || !account.email) return { found: false }
    return {
      found: true,
      via: 'email',
      channel: 'email',
      channels: [{ channel: 'email', hint: raw }],
    }
  }

  const account = findStubByPhone(raw)
  if (!account || !account.phone) return { found: false }
  return {
    found: true,
    via: 'phone',
    channel: 'phone',
    channels: [{ channel: 'phone', hint: raw }],
  }
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
