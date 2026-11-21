import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, isApiError } from '@/lib/api'
import { sha256Hex } from '@/lib/hash'
import { loginErrorMessage, normalizeLogin } from '@/lib/identity'

export function LoginPage() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [stubNotice, setStubNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStubNotice(null)
    setFormError(null)

    if (!normalizeLogin(login)) {
      setFormError(loginErrorMessage(login))
      return
    }

    setSubmitting(true)
    try {
      const passwordHash = await sha256Hex(password)
      await api('/auth/login', {
        method: 'POST',
        body: {
          login: normalizeLogin(login),
          passwordHash,
          rememberMe,
        },
      })
      navigate('/profile')
    } catch (error) {
      if (isApiError(error)) {
        setFormError(error.message)
      } else {
        setFormError('Не удалось войти.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleStubClick = (label: string) => {
    setStubNotice(`${label} — скоро.`)
  }

  const loginMissing = Boolean(formError) && !normalizeLogin(login)

  return (
    <div className="ui-auth-shell">
      <div className="ui-panel ui-auth-card">
        <header>
          {/* Product name slot — empty on this stage */}
          <h1 className="ui-auth-card__title">Вход</h1>
          <p className="ui-auth-card__subtitle">Войдите, чтобы продолжить.</p>
        </header>

        <form className="ui-stack" onSubmit={handleSubmit} noValidate>
          <div className="ui-field">
            <label className="ui-field__label" htmlFor="login-login">
              Логин
            </label>
            <input
              className="ui-input"
              id="login-login"
              name="login"
              type="text"
              autoComplete="username"
              value={login}
              aria-invalid={loginMissing || undefined}
              aria-describedby={loginMissing ? 'login-form-error' : undefined}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setLogin(event.target.value)
                if (formError) setFormError(null)
              }}
            />
          </div>

          <div className="ui-field">
            <label className="ui-field__label" htmlFor="login-password">
              Пароль
            </label>
            <input
              className="ui-input"
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setPassword(event.target.value)
                if (formError) setFormError(null)
              }}
            />
          </div>

          <label className="ui-checkbox" htmlFor="login-remember">
            <input
              className="ui-checkbox__control"
              id="login-remember"
              name="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setRememberMe(event.target.checked)
              }
            />
            <span>Запомнить меня</span>
          </label>

          {formError ? (
            <p id="login-form-error" className="ui-alert ui-alert--error" role="alert">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            className="ui-button ui-button--solid ui-button--full"
            disabled={submitting}
          >
            {submitting ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <p className="ui-text-muted ui-text-center">
          <Link className="ui-link" to="/forgot-password">
            Забыли пароль?
          </Link>
        </p>

        <hr className="ui-separator" />

        <div className="ui-stack ui-stack--sm">
          <button
            type="button"
            className="ui-button ui-button--outline ui-button--full"
            onClick={() => handleStubClick('Вход через Google')}
          >
            Войти через Google
          </button>
          <button
            type="button"
            className="ui-button ui-button--outline ui-button--full"
            onClick={() => handleStubClick('Вход через Яндекс')}
          >
            Войти через Яндекс
          </button>
          <button
            type="button"
            className="ui-button ui-button--outline ui-button--full"
            onClick={() => handleStubClick('Вход с Passkey')}
          >
            Войти с Passkey
          </button>
        </div>

        {stubNotice ? (
          <p className="ui-alert ui-alert--info" role="status">
            {stubNotice}
          </p>
        ) : null}

        <p className="ui-text-muted ui-text-center">
          Нет аккаунта?{' '}
          <Link className="ui-link" to="/register">
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  )
}
