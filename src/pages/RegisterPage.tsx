import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OtpInput } from '@/components/OtpInput'
import { api, isApiError } from '@/lib/api'
import { sha256Hex } from '@/lib/hash'
import type { ContactChannel } from '@/lib/identity'
import {
  emailErrorMessage,
  isValidEmail,
  isValidPhone,
  loginErrorMessage,
  normalizeEmail,
  normalizeLogin,
  normalizePhone,
  phoneErrorMessage,
} from '@/lib/identity'

type RegisterStep = 1 | 2

type AccountForm = {
  email: string
  login: string
  phone: string
  password: string
  confirmPassword: string
}

type FieldErrors = Partial<Record<keyof AccountForm | 'contacts', string>>

const emptyAccount: AccountForm = {
  email: '',
  login: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

function channelLabel(channel: ContactChannel): string {
  return channel === 'email' ? 'почту' : 'телефон'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<RegisterStep>(1)
  const [account, setAccount] = useState<AccountForm>(emptyAccount)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [channel, setChannel] = useState<ContactChannel>('email')
  const [submitting, setSubmitting] = useState(false)

  const availableChannels = useMemo(() => {
    const channels: ContactChannel[] = []
    if (account.email.trim()) channels.push('email')
    if (account.phone.trim()) channels.push('phone')
    return channels
  }, [account.email, account.phone])

  const updateField =
    (field: keyof AccountForm) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setAccount((prev) => ({ ...prev, [field]: value }))
      setFormError(null)
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        if (field === 'email' || field === 'phone') delete next.contacts
        if (field === 'password' || field === 'confirmPassword') {
          delete next.password
          delete next.confirmPassword
        }
        return next
      })
    }

  const validateAccount = (): FieldErrors => {
    const next: FieldErrors = {}
    const loginErr = loginErrorMessage(account.login)
    if (loginErr) next.login = loginErr

    const email = account.email.trim()
    const phone = account.phone.trim()
    if (!email && !phone) {
      next.contacts = 'Укажите почту или телефон.'
    }
    const emailErr = emailErrorMessage(account.email)
    if (emailErr) next.email = emailErr
    const phoneErr = phoneErrorMessage(account.phone)
    if (phoneErr) next.phone = phoneErr

    if (!account.password) {
      next.password = 'Введите пароль.'
    }
    if (!account.confirmPassword) {
      next.confirmPassword = 'Подтвердите пароль.'
    } else if (account.password !== account.confirmPassword) {
      next.confirmPassword = 'Пароли не совпадают.'
    }

    return next
  }

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateAccount()
    setErrors(nextErrors)
    setFormError(null)
    if (Object.keys(nextErrors).length > 0) return

    const login = normalizeLogin(account.login)
    const email = account.email.trim() ? normalizeEmail(account.email) : undefined
    const phone = account.phone.trim() ? normalizePhone(account.phone) : undefined

    setSubmitting(true)
    try {
      const passwordHash = await sha256Hex(account.password)
      await api('/auth/register', {
        method: 'POST',
        body: {
          login,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
          passwordHash,
        },
      })

      const channels: ContactChannel[] = []
      if (email && isValidEmail(email)) channels.push('email')
      if (phone && isValidPhone(phone)) channels.push('phone')
      setChannel(channels[0] ?? 'email')
      setAccount((prev) => ({
        ...prev,
        login,
        email: email ?? '',
        phone: phone ?? '',
      }))
      setOtp('')
      setOtpError(null)
      setStep(2)
    } catch (error) {
      if (isApiError(error)) {
        setFormError(error.message)
        if (error.fields?.includes('login')) {
          setErrors((prev) => ({ ...prev, login: error.message }))
        }
        if (error.fields?.includes('email')) {
          setErrors((prev) => ({ ...prev, email: error.message }))
        }
        if (error.fields?.includes('phone')) {
          setErrors((prev) => ({ ...prev, phone: error.message }))
        }
      } else {
        setFormError('Не удалось зарегистрироваться.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOtpError(null)
    setSubmitting(true)
    try {
      await api('/auth/register/confirm', {
        method: 'POST',
        body: {
          login: account.login,
          channel,
          code: otp,
        },
      })
      navigate('/login')
    } catch (error) {
      if (isApiError(error)) {
        setOtpError(error.message)
      } else {
        setOtpError('Не удалось подтвердить код.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    if (otpError) setOtpError(null)
  }

  const describedBy = (...ids: Array<string | false | null | undefined>) => {
    const joined = ids.filter(Boolean).join(' ')
    return joined || undefined
  }

  return (
    <div className="ui-auth-shell">
      <div className="ui-panel ui-auth-card">
        <header>
          {/* Product name slot — empty on this stage */}
          <h1 className="ui-auth-card__title">
            {step === 1 ? 'Регистрация' : 'Подтверждение'}
          </h1>
          <p className="ui-auth-card__subtitle">
            {step === 1
              ? 'Создайте аккаунт, чтобы продолжить.'
              : availableChannels.length === 1
                ? `Введите код, отправленный на ${channelLabel(availableChannels[0])}.`
                : 'Выберите канал и введите код.'}
          </p>
        </header>

        {step === 1 ? (
          <form className="ui-stack" onSubmit={handleAccountSubmit} noValidate>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-login">
                Логин
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                className="ui-input"
                id="register-login"
                name="login"
                type="text"
                autoComplete="username"
                value={account.login}
                onChange={updateField('login')}
                aria-invalid={Boolean(errors.login)}
                aria-describedby={describedBy(
                  'register-login-hint',
                  errors.login && 'register-login-error',
                )}
                required
              />
              <p id="register-login-hint" className="ui-field__helper">
                3–32 символа, латиница в нижнем регистре, цифры и . _ -
              </p>
              {errors.login ? (
                <p id="register-login-error" className="ui-field__error" role="alert">
                  {errors.login}
                </p>
              ) : null}
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-email">
                Почта
              </label>
              <input
                className="ui-input"
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                value={account.email}
                onChange={updateField('email')}
                aria-invalid={Boolean(errors.email || errors.contacts)}
                aria-describedby={describedBy(
                  'register-contacts-hint',
                  errors.email && 'register-email-error',
                  errors.contacts && 'register-contacts-error',
                )}
              />
              {errors.email ? (
                <p id="register-email-error" className="ui-field__error" role="alert">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-phone">
                Телефон
              </label>
              <input
                className="ui-input"
                id="register-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={account.phone}
                onChange={updateField('phone')}
                aria-invalid={Boolean(errors.phone || errors.contacts)}
                aria-describedby={describedBy(
                  'register-contacts-hint',
                  errors.phone && 'register-phone-error',
                  errors.contacts && 'register-contacts-error',
                )}
              />
              <p id="register-contacts-hint" className="ui-field__helper">
                Нужна почта или телефон. Можно указать оба.
              </p>
              {errors.phone ? (
                <p id="register-phone-error" className="ui-field__error" role="alert">
                  {errors.phone}
                </p>
              ) : null}
              {errors.contacts ? (
                <p id="register-contacts-error" className="ui-field__error" role="alert">
                  {errors.contacts}
                </p>
              ) : null}
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-password">
                Пароль
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                className="ui-input"
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={account.password}
                onChange={updateField('password')}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? 'register-password-error' : undefined
                }
                required
              />
              {errors.password ? (
                <p id="register-password-error" className="ui-field__error" role="alert">
                  {errors.password}
                </p>
              ) : null}
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-confirm-password">
                Подтверждение пароля
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                className="ui-input"
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={account.confirmPassword}
                onChange={updateField('confirmPassword')}
                aria-invalid={Boolean(errors.confirmPassword)}
                aria-describedby={
                  errors.confirmPassword
                    ? 'register-confirm-password-error'
                    : undefined
                }
                required
              />
              {errors.confirmPassword ? (
                <p
                  id="register-confirm-password-error"
                  className="ui-field__error"
                  role="alert"
                >
                  {errors.confirmPassword}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p className="ui-alert ui-alert--error" role="alert">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              className="ui-button ui-button--solid ui-button--full"
              disabled={submitting}
            >
              {submitting ? 'Отправка…' : 'Далее'}
            </button>
          </form>
        ) : (
          <form className="ui-stack" onSubmit={handleOtpSubmit} noValidate>
            {availableChannels.length > 1 ? (
              <fieldset className="ui-field">
                <legend className="ui-field__label">Куда отправить код</legend>
                <div
                  className="ui-radio-group"
                  role="radiogroup"
                  aria-label="Канал подтверждения"
                >
                  <label className="ui-radio" htmlFor="register-channel-email">
                    <input
                      className="ui-radio__control"
                      id="register-channel-email"
                      type="radio"
                      name="channel"
                      value="email"
                      checked={channel === 'email'}
                      onChange={() => setChannel('email')}
                    />
                    <span>Почта ({account.email})</span>
                  </label>
                  <label className="ui-radio" htmlFor="register-channel-phone">
                    <input
                      className="ui-radio__control"
                      id="register-channel-phone"
                      type="radio"
                      name="channel"
                      value="phone"
                      checked={channel === 'phone'}
                      onChange={() => setChannel('phone')}
                    />
                    <span>Телефон ({account.phone})</span>
                  </label>
                </div>
              </fieldset>
            ) : null}

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="otp">
                Код подтверждения
              </label>
              <OtpInput
                id="otp"
                value={otp}
                onChange={handleOtpChange}
                describedBy={otpError ? 'otp-error otp-hint' : 'otp-hint'}
                invalid={Boolean(otpError)}
                autoFocus
              />
              <p id="otp-hint" className="ui-field__helper">
                6 цифр. Для проверки используйте 000000.
              </p>
              {otpError ? (
                <p id="otp-error" className="ui-field__error" role="alert">
                  {otpError}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className="ui-button ui-button--solid ui-button--full"
              disabled={submitting}
            >
              {submitting ? 'Проверка…' : 'Подтвердить'}
            </button>

            <button
              type="button"
              className="ui-button ui-button--ghost ui-button--full"
              disabled={submitting}
              onClick={() => {
                setStep(1)
                setOtp('')
                setOtpError(null)
              }}
            >
              Назад
            </button>
          </form>
        )}

        {step === 1 ? (
          <p className="ui-text-muted ui-text-center">
            Уже есть аккаунт?{' '}
            <Link className="ui-link" to="/login">
              Войти
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}
