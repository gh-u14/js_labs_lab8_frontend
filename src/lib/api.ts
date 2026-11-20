import type { ContactChannel, IdentifierKind } from '@/lib/identity'

export type Profile = {
  id: string
  login: string
  email: string | null
  phone: string | null
  firstName: string
  lastName: string
  emailVerified: boolean
  phoneVerified: boolean
  unverifiedExpiresAt: string | null
}

export type RecoveryChannelHint = {
  channel: ContactChannel
  hint: string
}

export type RecoveryStartResponse = {
  via: IdentifierKind
  channel: ContactChannel
  channels: RecoveryChannelHint[]
}

export type ApiErrorBody = {
  code: string
  message: string
  fields?: Array<'login' | 'email' | 'phone'>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Array<'login' | 'email' | 'phone'>

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
  }
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body } = options
  const headers: HeadersInit = {}
  let payload: string | undefined

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers,
    body: payload,
  })

  if (response.status === 204) {
    return null as T
  }

  const text = await response.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const error =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      data.error &&
      typeof data.error === 'object'
        ? (data.error as ApiErrorBody)
        : { code: 'unknown', message: 'Запрос не выполнен.' }
    throw new ApiError(response.status, {
      code: error.code ?? 'unknown',
      message: error.message ?? 'Запрос не выполнен.',
      fields: error.fields,
    })
  }

  return data as T
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
