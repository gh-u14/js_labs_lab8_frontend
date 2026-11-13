import { Link } from 'react-router-dom'

/** Minimal stub until frontend_02_login. */
export function LoginPage() {
  return (
    <div className="ui-auth-shell">
      <div className="ui-panel ui-auth-card">
        <header>
          <h1 className="ui-auth-card__title">Вход</h1>
          <p className="ui-auth-card__subtitle">Страница входа будет в следующей подзадаче.</p>
        </header>
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
