import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'

type ProfileTab = 'general' | 'security'

type GeneralForm = {
  login: string
  firstName: string
  lastName: string
  email: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const initialGeneral: GeneralForm = {
  login: 'demo',
  firstName: '',
  lastName: '',
  email: 'demo@example.com',
}

const emptyPassword: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'security', label: 'Безопасность' },
]

export function ProfilePage() {
  const baseId = useId()
  const [tab, setTab] = useState<ProfileTab>('general')
  const [general, setGeneral] = useState<GeneralForm>(initialGeneral)
  const [password, setPassword] = useState<PasswordForm>(emptyPassword)
  const [generalSaved, setGeneralSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [bindNotice, setBindNotice] = useState<string | null>(null)

  const tabIds = {
    general: `${baseId}-tab-general`,
    security: `${baseId}-tab-security`,
  }
  const panelIds = {
    general: `${baseId}-panel-general`,
    security: `${baseId}-panel-security`,
  }

  const updateGeneral =
    (field: keyof GeneralForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setGeneral((prev) => ({ ...prev, [field]: event.target.value }))
      setGeneralSaved(false)
    }

  const updatePassword =
    (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setPassword((prev) => ({ ...prev, [field]: event.target.value }))
      setPasswordSaved(false)
    }

  const handleGeneralSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setGeneralSaved(true)
    setBindNotice(null)
  }

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPassword(emptyPassword)
    setPasswordSaved(true)
    setBindNotice(null)
  }

  const handleBindStub = (label: string) => {
    setBindNotice(`${label} — скоро.`)
    setGeneralSaved(false)
    setPasswordSaved(false)
  }

  const selectTab = (next: ProfileTab) => {
    setTab(next)
  }

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((item) => item.id === tab)
    if (index < 0) return

    let nextIndex = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % TABS.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + TABS.length) % TABS.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextTab = TABS[nextIndex]
    selectTab(nextTab.id)
    document.getElementById(tabIds[nextTab.id])?.focus()
  }

  return (
    <div className="ui-settings-shell">
      <div className="ui-settings-stack">
        <header>
          <h1 className="ui-settings-stack__title">Настройки профиля</h1>
        </header>

        <div className="ui-panel ui-settings-panel">
          <div
            className="ui-tabs"
            role="tablist"
            aria-label="Разделы профиля"
            onKeyDown={handleTabListKeyDown}
          >
            {TABS.map((item) => {
              const selected = tab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    selected ? 'ui-tabs__tab ui-tabs__tab--selected' : 'ui-tabs__tab'
                  }
                  role="tab"
                  id={tabIds[item.id]}
                  aria-selected={selected}
                  aria-controls={panelIds[item.id]}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectTab(item.id)}
                >
                  {item.label}
                </button>
              )
            })}
          </div>

          <div
            className="ui-tabs__panel"
            role="tabpanel"
            id={panelIds.general}
            aria-labelledby={tabIds.general}
            hidden={tab !== 'general'}
          >
            <h2 className="ui-settings-section__title">Общие данные</h2>

            <form className="ui-stack" onSubmit={handleGeneralSubmit} noValidate>
              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-login">
                  Логин
                </label>
                <input
                  className="ui-input"
                  id="profile-login"
                  name="login"
                  type="text"
                  autoComplete="username"
                  value={general.login}
                  onChange={updateGeneral('login')}
                />
              </div>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-first-name">
                  Имя
                </label>
                <input
                  className="ui-input"
                  id="profile-first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  value={general.firstName}
                  onChange={updateGeneral('firstName')}
                />
              </div>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-last-name">
                  Фамилия
                </label>
                <input
                  className="ui-input"
                  id="profile-last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  value={general.lastName}
                  onChange={updateGeneral('lastName')}
                />
              </div>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-email">
                  Почта
                </label>
                <input
                  className="ui-input"
                  id="profile-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={general.email}
                  onChange={updateGeneral('email')}
                />
              </div>

              <button type="submit" className="ui-button ui-button--solid">
                Сохранить
              </button>

              {generalSaved ? (
                <p className="ui-alert ui-alert--success" role="status">
                  Данные сохранены (заглушка).
                </p>
              ) : null}
            </form>
          </div>

          <div
            className="ui-tabs__panel"
            role="tabpanel"
            id={panelIds.security}
            aria-labelledby={tabIds.security}
            hidden={tab !== 'security'}
          >
            <h2 className="ui-settings-section__title">Безопасность</h2>

            <form className="ui-stack" onSubmit={handlePasswordSubmit} noValidate>
              <h3 className="ui-settings-block__title">Смена пароля</h3>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-current-password">
                  Текущий пароль
                </label>
                <input
                  className="ui-input"
                  id="profile-current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={updatePassword('currentPassword')}
                />
              </div>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-new-password">
                  Новый пароль
                </label>
                <input
                  className="ui-input"
                  id="profile-new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={password.newPassword}
                  onChange={updatePassword('newPassword')}
                />
              </div>

              <div className="ui-field">
                <label className="ui-field__label" htmlFor="profile-confirm-password">
                  Подтверждение пароля
                </label>
                <input
                  className="ui-input"
                  id="profile-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={password.confirmPassword}
                  onChange={updatePassword('confirmPassword')}
                />
              </div>

              <button type="submit" className="ui-button ui-button--solid">
                Сменить пароль
              </button>

              {passwordSaved ? (
                <p className="ui-alert ui-alert--success" role="status">
                  Пароль обновлён (заглушка).
                </p>
              ) : null}
            </form>

            <hr className="ui-separator" />

            <div className="ui-stack">
              <h3 className="ui-settings-block__title">Способы входа</h3>
              <p className="ui-text-muted">
                Привязка провайдеров — заглушки, без реального OAuth.
              </p>

              <div className="ui-stack ui-stack--sm">
                <button
                  type="button"
                  className="ui-button ui-button--outline ui-button--full"
                  onClick={() => handleBindStub('Привязка Google')}
                >
                  Привязать Google
                </button>
                <button
                  type="button"
                  className="ui-button ui-button--outline ui-button--full"
                  onClick={() => handleBindStub('Привязка Яндекс')}
                >
                  Привязать Яндекс
                </button>
                <button
                  type="button"
                  className="ui-button ui-button--outline ui-button--full"
                  onClick={() => handleBindStub('Добавление Passkey')}
                >
                  Добавить Passkey
                </button>
              </div>

              {bindNotice ? (
                <p className="ui-alert ui-alert--info" role="status">
                  {bindNotice}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
