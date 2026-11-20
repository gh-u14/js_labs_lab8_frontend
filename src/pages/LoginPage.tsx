import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [stubNotice, setStubNotice] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStubNotice(null)
    navigate('/profile')
  }

  const handleStubClick = (label: string) => {
    setStubNotice(`${label} — скоро.`)
  }

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
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLogin(event.target.value)
              }
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
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setPassword(event.target.value)
              }
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

          <button type="submit" className="ui-button ui-button--solid ui-button--full">
            Войти
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
