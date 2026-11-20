import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OtpInput } from '@/components/OtpInput'
import {
  api,
  isApiError,
  type RecoveryStartResponse,
} from '@/lib/api'
import { sha256Hex } from '@/lib/hash'
import type { ContactChannel } from '@/lib/identity'

type ForgotStep = 1 | 2 | 3

function channelHintText(channel: ContactChannel, hint: string): string {
  return channel === 'email'
    ? `Код отправлен на почту ${hint}.`
    : `Код отправлен на телефон ${hint}.`
}

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<ForgotStep>(1)
  const [identifier, setIdentifier] = useState('')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [recovery, setRecovery] = useState<RecoveryStartResponse | null>(null)
  const [channel, setChannel] = useState<ContactChannel>('email')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [stubNotice, setStubNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const currentHint =
    recovery?.channels.find((item) => item.channel === channel)?.hint ?? ''

  const subtitle =
    step === 1
      ? 'Укажите данные аккаунта, чтобы получить код.'
      : step === 2
        ? 'Введите код.'
        : 'Задайте новый пароль.'

  const handleIdentifierSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStubNotice(null)
    setLookupError(null)
    setFormError(null)
    setSubmitting(true)
    try {
      const result = await api<RecoveryStartResponse>('/auth/recovery', {
        method: 'POST',
        body: { identifier: identifier.trim() },
      })
      setRecovery(result)
      setChannel(result.channel)
      setOtp('')
      setOtpError(null)
      setStep(2)
    } catch (error) {
      if (isApiError(error) && error.code === 'user_not_found') {
        setRecovery(null)
        setLookupError(error.message || 'Пользователь не найден')
        return
      }
      if (isApiError(error)) {
        setLookupError(error.message)
      } else {
        setLookupError('Не удалось начать восстановление.')
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
      const result = await api<{ resetToken: string }>('/auth/recovery/confirm', {
        method: 'POST',
        body: {
          identifier: identifier.trim(),
          channel,
          code: otp,
        },
      })
      setResetToken(result.resetToken)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
      setFormError(null)
      setStep(3)
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

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: { newPassword?: string; confirmPassword?: string } = {}
    if (!newPassword) next.newPassword = 'Введите новый пароль.'
    if (!confirmPassword) next.confirmPassword = 'Подтвердите пароль.'
    else if (newPassword !== confirmPassword) {
      next.confirmPassword = 'Пароли не совпадают.'
    }
    setPasswordErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || !resetToken) return

    setSubmitting(true)
    try {
      const passwordHash = await sha256Hex(newPassword)
      await api('/auth/recovery/complete', {
        method: 'POST',
        body: { resetToken, passwordHash },
      })
      navigate('/login')
    } catch (error) {
      if (isApiError(error)) {
        setFormError(error.message)
      } else {
        setFormError('Не удалось сохранить пароль.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    if (otpError) setOtpError(null)
  }

  const handleStubClick = (label: string) => {
    setStubNotice(`${label} — скоро.`)
  }

  const canSwitchChannel = Boolean(recovery && recovery.channels.length > 1)

  return (
    <div className="ui-auth-shell">
      <div className="ui-panel ui-auth-card">
        <header>
          {/* Product name slot — empty on this stage */}
          <h1 className="ui-auth-card__title">Восстановление пароля</h1>
          <p className="ui-auth-card__subtitle">{subtitle}</p>
        </header>

        {step === 1 ? (
          <>
            <form className="ui-stack" onSubmit={handleIdentifierSubmit} noValidate>
              <div className="ui-field">
                <label className="ui-field__label" htmlFor="forgot-identifier">
                  Логин, почта или телефон
                </label>
                <input
                  className="ui-input"
                  id="forgot-identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setIdentifier(event.target.value)
                    if (lookupError) setLookupError(null)
                  }}
                  aria-invalid={Boolean(lookupError)}
                  aria-describedby={
                    lookupError ? 'forgot-identifier-error' : undefined
                  }
                />
                {lookupError ? (
                  <p
                    id="forgot-identifier-error"
                    className="ui-field__error"
                    role="alert"
                  >
                    {lookupError}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                className="ui-button ui-button--solid ui-button--full"
                disabled={submitting}
              >
                {submitting ? 'Поиск…' : 'Далее'}
              </button>
            </form>

            <hr className="ui-separator" />

            <div className="ui-stack ui-stack--sm">
              <button
                type="button"
                className="ui-button ui-button--outline ui-button--full"
                onClick={() => handleStubClick('Восстановление через Google')}
              >
                Продолжить через Google
              </button>
              <button
                type="button"
                className="ui-button ui-button--outline ui-button--full"
                onClick={() => handleStubClick('Восстановление через Яндекс')}
              >
                Продолжить через Яндекс
              </button>
              <button
                type="button"
                className="ui-button ui-button--outline ui-button--full"
                onClick={() => handleStubClick('Восстановление с Passkey')}
              >
                Продолжить с Passkey
              </button>
            </div>

            {stubNotice ? (
              <p className="ui-alert ui-alert--info" role="status">
                {stubNotice}
              </p>
            ) : null}
          </>
        ) : null}

        {step === 2 && recovery ? (
          <form className="ui-stack" onSubmit={handleOtpSubmit} noValidate>
            <p className="ui-alert ui-alert--info" role="status">
              {channelHintText(channel, currentHint)}
            </p>

            {canSwitchChannel ? (
              <fieldset className="ui-field">
                <legend className="ui-field__label">Канал</legend>
                <div
                  className="ui-radio-group"
                  role="radiogroup"
                  aria-label="Канал восстановления"
                >
                  {recovery.channels.map((item) => (
                    <label
                      key={item.channel}
                      className="ui-radio"
                      htmlFor={`forgot-channel-${item.channel}`}
                    >
                      <input
                        className="ui-radio__control"
                        id={`forgot-channel-${item.channel}`}
                        type="radio"
                        name="recoveryChannel"
                        value={item.channel}
                        checked={channel === item.channel}
                        onChange={() => setChannel(item.channel)}
                      />
                      <span>
                        {item.channel === 'email' ? 'Почта' : 'Телефон'} ({item.hint})
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="forgot-otp">
                Код подтверждения
              </label>
              <OtpInput
                id="forgot-otp"
                value={otp}
                onChange={handleOtpChange}
                describedBy={
                  otpError ? 'forgot-otp-error forgot-otp-hint' : 'forgot-otp-hint'
                }
                invalid={Boolean(otpError)}
                autoFocus
              />
              <p id="forgot-otp-hint" className="ui-field__helper">
                6 цифр. Для проверки используйте 000000.
              </p>
              {otpError ? (
                <p id="forgot-otp-error" className="ui-field__error" role="alert">
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
        ) : null}

        {step === 3 ? (
          <form className="ui-stack" onSubmit={handlePasswordSubmit} noValidate>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor="forgot-new-password">
                Новый пароль
              </label>
              <input
                className="ui-input"
                id="forgot-new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setNewPassword(event.target.value)
                  setPasswordErrors((prev) => {
                    const next = { ...prev }
                    delete next.newPassword
                    delete next.confirmPassword
                    return next
                  })
                }}
                aria-invalid={Boolean(passwordErrors.newPassword)}
                aria-describedby={
                  passwordErrors.newPassword
                    ? 'forgot-new-password-error'
                    : undefined
                }
              />
              {passwordErrors.newPassword ? (
                <p
                  id="forgot-new-password-error"
                  className="ui-field__error"
                  role="alert"
                >
                  {passwordErrors.newPassword}
                </p>
              ) : null}
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="forgot-confirm-password">
                Подтверждение пароля
              </label>
              <input
                className="ui-input"
                id="forgot-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setConfirmPassword(event.target.value)
                  setPasswordErrors((prev) => {
                    const next = { ...prev }
                    delete next.confirmPassword
                    return next
                  })
                }}
                aria-invalid={Boolean(passwordErrors.confirmPassword)}
                aria-describedby={
                  passwordErrors.confirmPassword
                    ? 'forgot-confirm-password-error'
                    : undefined
                }
              />
              {passwordErrors.confirmPassword ? (
                <p
                  id="forgot-confirm-password-error"
                  className="ui-field__error"
                  role="alert"
                >
                  {passwordErrors.confirmPassword}
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
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>

            <button
              type="button"
              className="ui-button ui-button--ghost ui-button--full"
              disabled={submitting}
              onClick={() => {
                setStep(2)
                setOtp('')
                setOtpError(null)
              }}
            >
              Назад
            </button>
          </form>
        ) : null}

        <p className="ui-text-muted ui-text-center">
          <Link className="ui-link" to="/login">
            Назад ко входу
          </Link>
        </p>
      </div>
    </div>
  )
}
