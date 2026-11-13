import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { OtpInput } from '@/components/OtpInput'

const MOCK_OTP = '000000'

type RegisterStep = 1 | 2

type AccountForm = {
  email: string
  login: string
  phone: string
  password: string
  confirmPassword: string
}

const emptyAccount: AccountForm = {
  email: '',
  login: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<RegisterStep>(1)
  const [account, setAccount] = useState<AccountForm>(emptyAccount)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)

  const updateField =
    (field: keyof AccountForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setAccount((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setOtp('')
    setOtpError(null)
    setStep(2)
  }

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (otp === MOCK_OTP) {
      setOtpError(null)
      navigate('/login')
      return
    }
    setOtpError('Неверный код. Для проверки используйте 000000.')
  }

  const handleOtpChange = (value: string) => {
    setOtp(value)
    if (otpError) setOtpError(null)
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
              : 'Введите код из сообщения.'}
          </p>
        </header>

        {step === 1 ? (
          <form className="ui-stack" onSubmit={handleAccountSubmit} noValidate>
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
              />
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-login">
                Логин
              </label>
              <input
                className="ui-input"
                id="register-login"
                name="login"
                type="text"
                autoComplete="username"
                value={account.login}
                onChange={updateField('login')}
              />
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
                autoComplete="tel"
                value={account.phone}
                onChange={updateField('phone')}
              />
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-password">
                Пароль
              </label>
              <input
                className="ui-input"
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={account.password}
                onChange={updateField('password')}
              />
            </div>

            <div className="ui-field">
              <label className="ui-field__label" htmlFor="register-confirm-password">
                Подтверждение пароля
              </label>
              <input
                className="ui-input"
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={account.confirmPassword}
                onChange={updateField('confirmPassword')}
              />
            </div>

            <button type="submit" className="ui-button ui-button--solid ui-button--full">
              Далее
            </button>
          </form>
        ) : (
          <form className="ui-stack" onSubmit={handleOtpSubmit} noValidate>
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

            <button type="submit" className="ui-button ui-button--solid ui-button--full">
              Подтвердить
            </button>

            <button
              type="button"
              className="ui-button ui-button--ghost ui-button--full"
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
