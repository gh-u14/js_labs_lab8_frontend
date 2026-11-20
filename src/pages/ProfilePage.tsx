import { useId, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpInput } from '@/components/OtpInput'
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

const MOCK_OTP = '000000'

type ProfileTab = 'general' | 'security'

type GeneralForm = {
  login: string
  firstName: string
  lastName: string
}

type PasswordForm = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

type ContactState = {
  value: string | null
  verified: boolean
}

type ProfileContacts = {
  email: ContactState
  phone: ContactState
  unverifiedExpiresAt: string | null
}

type ContactAction =
  | { type: 'confirm'; channel: ContactChannel }
  | { type: 'replace'; channel: ContactChannel; nextValue: string }

const initialGeneral: GeneralForm = {
  login: 'demo',
  firstName: '',
  lastName: '',
}

const emptyPassword: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

function createInitialContacts(): ProfileContacts {
  return {
    email: { value: 'demo@example.com', verified: true },
    phone: { value: '79001234567', verified: false },
    unverifiedExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

const TABS: { id: ProfileTab; label: string }[] = [
  { id: 'general', label: 'Общие' },
  { id: 'security', label: 'Безопасность' },
]

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function channelTitle(channel: ContactChannel): string {
  return channel === 'email' ? 'Почта' : 'Телефон'
}

export function ProfilePage() {
  const navigate = useNavigate()
  const baseId = useId()
  const [tab, setTab] = useState<ProfileTab>('general')
  const [general, setGeneral] = useState<GeneralForm>(initialGeneral)
  const [generalErrors, setGeneralErrors] = useState<{ login?: string }>({})
  const [password, setPassword] = useState<PasswordForm>(emptyPassword)
  const [contacts, setContacts] = useState<ProfileContacts>(createInitialContacts)
  const [generalSaved, setGeneralSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [bindNotice, setBindNotice] = useState<string | null>(null)
  const [contactNotice, setContactNotice] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<ContactAction | null>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [draftErrors, setDraftErrors] = useState<{
    email?: string
    phone?: string
  }>({})

  const tabIds = {
    general: `${baseId}-tab-general`,
    security: `${baseId}-tab-security`,
  }
  const panelIds = {
    general: `${baseId}-panel-general`,
    security: `${baseId}-panel-security`,
  }

  const unverifiedChannel = useMemo((): ContactChannel | null => {
    if (contacts.email.value && !contacts.email.verified) return 'email'
    if (contacts.phone.value && !contacts.phone.verified) return 'phone'
    return null
  }, [contacts])

  const canClear = (channel: ContactChannel): boolean => {
    const current = contacts[channel]
    if (!current.value) return false
    if (!current.verified) return true
    const other = channel === 'email' ? contacts.phone : contacts.email
    return Boolean(other.value && other.verified)
  }

  const updateGeneral =
    (field: keyof GeneralForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setGeneral((prev) => ({ ...prev, [field]: event.target.value }))
      setGeneralSaved(false)
      if (field === 'login') {
        setGeneralErrors((prev) => {
          const next = { ...prev }
          delete next.login
          return next
        })
      }
    }

  const updatePassword =
    (field: keyof PasswordForm) => (event: ChangeEvent<HTMLInputElement>) => {
      setPassword((prev) => ({ ...prev, [field]: event.target.value }))
      setPasswordSaved(false)
    }

  const handleGeneralSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const loginErr = loginErrorMessage(general.login)
    if (loginErr) {
      setGeneralErrors({ login: loginErr })
      return
    }
    setGeneral((prev) => ({ ...prev, login: normalizeLogin(prev.login) }))
    setGeneralSaved(true)
    setBindNotice(null)
    setContactNotice(null)
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

  const startConfirm = (channel: ContactChannel) => {
    setPendingAction({ type: 'confirm', channel })
    setOtp('')
    setOtpError(null)
    setContactNotice(null)
  }

  const startReplace = (channel: ContactChannel) => {
    const draft = channel === 'email' ? draftEmail.trim() : draftPhone.trim()
    const error =
      channel === 'email' ? emailErrorMessage(draft) : phoneErrorMessage(draft)
    if (!draft) {
      setDraftErrors((prev) => ({
        ...prev,
        [channel]: channel === 'email' ? 'Введите почту.' : 'Введите телефон.',
      }))
      return
    }
    if (error) {
      setDraftErrors((prev) => ({ ...prev, [channel]: error }))
      return
    }
    if (channel === 'email' && !isValidEmail(draft)) return
    if (channel === 'phone' && !isValidPhone(draft)) return

    const nextValue =
      channel === 'email' ? normalizeEmail(draft) : normalizePhone(draft)
    setPendingAction({ type: 'replace', channel, nextValue })
    setOtp('')
    setOtpError(null)
    setContactNotice(null)
    setDraftErrors((prev) => {
      const next = { ...prev }
      delete next[channel]
      return next
    })
  }

  const clearContact = (channel: ContactChannel) => {
    if (!canClear(channel)) return
    setContacts((prev) => {
      const next: ProfileContacts = {
        ...prev,
        [channel]: { value: null, verified: false },
      }
      const stillUnverified =
        (next.email.value && !next.email.verified) ||
        (next.phone.value && !next.phone.verified)
      if (!stillUnverified) next.unverifiedExpiresAt = null
      return next
    })
    setContactNotice(
      channel === 'email' ? 'Почта удалена.' : 'Телефон удалён.',
    )
    setPendingAction(null)
    setOtp('')
    setOtpError(null)
  }

  const handleContactOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingAction) return
    if (otp !== MOCK_OTP) {
      setOtpError('Неверный код. Для проверки используйте 000000.')
      return
    }

    setContacts((prev) => {
      if (pendingAction.type === 'confirm') {
        const next: ProfileContacts = {
          ...prev,
          [pendingAction.channel]: {
            value: prev[pendingAction.channel].value,
            verified: true,
          },
        }
        const stillUnverified =
          (next.email.value && !next.email.verified) ||
          (next.phone.value && !next.phone.verified)
        if (!stillUnverified) next.unverifiedExpiresAt = null
        return next
      }

      const next: ProfileContacts = {
        ...prev,
        [pendingAction.channel]: {
          value: pendingAction.nextValue,
          verified: true,
        },
      }
      const stillUnverified =
        (next.email.value && !next.email.verified) ||
        (next.phone.value && !next.phone.verified)
      if (!stillUnverified) next.unverifiedExpiresAt = null
      return next
    })

    if (pendingAction.type === 'replace') {
      if (pendingAction.channel === 'email') setDraftEmail('')
      else setDraftPhone('')
      setContactNotice(
        pendingAction.channel === 'email'
          ? 'Почта обновлена.'
          : 'Телефон обновлён.',
      )
    } else {
      setContactNotice(
        pendingAction.channel === 'email'
          ? 'Почта подтверждена.'
          : 'Телефон подтверждён.',
      )
    }

    setPendingAction(null)
    setOtp('')
    setOtpError(null)
  }

  const selectTab = (next: ProfileTab) => {
    setTab(next)
  }

  const handleLogout = () => {
    navigate('/login')
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

  const renderContactCard = (channel: ContactChannel) => {
    const contact = contacts[channel]
    const draft = channel === 'email' ? draftEmail : draftPhone
    const draftError = draftErrors[channel]
    const hasValue = Boolean(contact.value)
    const clearAllowed = canClear(channel)
    const actionForChannel =
      pendingAction !== null && pendingAction.channel === channel
        ? pendingAction
        : null

    return (
      <div className="ui-contact" key={channel}>
        <div className="ui-contact__header">
          <span className="ui-contact__title">{channelTitle(channel)}</span>
          <span className="ui-contact__meta">
            {!hasValue
              ? 'Не указан'
              : contact.verified
                ? 'Подтверждён'
                : 'Не подтверждён'}
          </span>
        </div>

        <p className="ui-contact__value">
          {contact.value ?? '—'}
        </p>

        {actionForChannel ? (
          <form className="ui-stack ui-stack--sm" onSubmit={handleContactOtpSubmit}>
            <p className="ui-field__helper">
              {actionForChannel.type === 'confirm'
                ? `Введите код для подтверждения ${channel === 'email' ? 'почты' : 'телефона'}.`
                : `Пока код не принят, на экране остаётся старое значение. Новый ${
                    channel === 'email' ? 'адрес' : 'номер'
                  }: ${actionForChannel.nextValue}`}
            </p>
            <div className="ui-field">
              <label className="ui-field__label" htmlFor={`profile-otp-${channel}`}>
                Код подтверждения
              </label>
              <OtpInput
                id={`profile-otp-${channel}`}
                value={otp}
                onChange={(value) => {
                  setOtp(value)
                  if (otpError) setOtpError(null)
                }}
                describedBy={
                  otpError
                    ? `profile-otp-${channel}-error profile-otp-${channel}-hint`
                    : `profile-otp-${channel}-hint`
                }
                invalid={Boolean(otpError)}
                autoFocus
              />
              <p id={`profile-otp-${channel}-hint`} className="ui-field__helper">
                6 цифр. Для проверки используйте 000000.
              </p>
              {otpError ? (
                <p
                  id={`profile-otp-${channel}-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {otpError}
                </p>
              ) : null}
            </div>
            <div className="ui-contact__actions">
              <button type="submit" className="ui-button ui-button--solid ui-button--sm">
                Подтвердить код
              </button>
              <button
                type="button"
                className="ui-button ui-button--ghost ui-button--sm"
                onClick={() => {
                  setPendingAction(null)
                  setOtp('')
                  setOtpError(null)
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="ui-field">
              <label
                className="ui-field__label"
                htmlFor={`profile-draft-${channel}`}
              >
                {hasValue ? 'Новое значение' : 'Добавить'}
              </label>
              <input
                className="ui-input"
                id={`profile-draft-${channel}`}
                name={`draft-${channel}`}
                type={channel === 'email' ? 'email' : 'tel'}
                inputMode={channel === 'phone' ? 'numeric' : undefined}
                autoComplete={channel === 'email' ? 'email' : 'tel'}
                value={draft}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  if (channel === 'email') setDraftEmail(event.target.value)
                  else setDraftPhone(event.target.value)
                  setDraftErrors((prev) => {
                    const next = { ...prev }
                    delete next[channel]
                    return next
                  })
                }}
                aria-invalid={Boolean(draftError)}
                aria-describedby={
                  draftError ? `profile-draft-${channel}-error` : undefined
                }
              />
              {draftError ? (
                <p
                  id={`profile-draft-${channel}-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {draftError}
                </p>
              ) : null}
            </div>

            <div className="ui-contact__actions">
              <button
                type="button"
                className="ui-button ui-button--solid ui-button--sm"
                onClick={() => startReplace(channel)}
              >
                {hasValue ? 'Заменить' : 'Добавить'}
              </button>
              {hasValue && !contact.verified ? (
                <button
                  type="button"
                  className="ui-button ui-button--outline ui-button--sm"
                  onClick={() => startConfirm(channel)}
                >
                  Подтвердить
                </button>
              ) : null}
              {hasValue ? (
                <button
                  type="button"
                  className="ui-button ui-button--ghost ui-button--sm"
                  onClick={() => clearContact(channel)}
                  disabled={!clearAllowed}
                  aria-describedby={
                    !clearAllowed ? `profile-clear-${channel}-hint` : undefined
                  }
                >
                  Очистить
                </button>
              ) : null}
            </div>
            {hasValue && !clearAllowed ? (
              <p id={`profile-clear-${channel}-hint`} className="ui-field__helper">
                Последний подтверждённый контакт удалить нельзя.
              </p>
            ) : null}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="ui-settings-shell">
      <div className="ui-settings-stack">
        <header className="ui-settings-header">
          <h1 className="ui-settings-stack__title">Настройки профиля</h1>
          <button
            type="button"
            className="ui-button ui-button--outline"
            onClick={handleLogout}
          >
            Выйти
          </button>
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
                  aria-invalid={Boolean(generalErrors.login)}
                  aria-describedby={
                    generalErrors.login ? 'profile-login-error' : undefined
                  }
                />
                {generalErrors.login ? (
                  <p id="profile-login-error" className="ui-field__error" role="alert">
                    {generalErrors.login}
                  </p>
                ) : null}
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

              <button type="submit" className="ui-button ui-button--solid">
                Сохранить
              </button>

              {generalSaved ? (
                <p className="ui-alert ui-alert--success" role="status">
                  Данные сохранены (заглушка).
                </p>
              ) : null}
            </form>

            <hr className="ui-separator" />

            <h3 className="ui-settings-block__title">Контакты</h3>

            {unverifiedChannel && contacts.unverifiedExpiresAt ? (
              <p className="ui-alert ui-alert--info" role="status">
                {channelTitle(unverifiedChannel)} не подтверждён до{' '}
                {formatExpiry(contacts.unverifiedExpiresAt)}.
              </p>
            ) : null}

            <div className="ui-stack">
              {renderContactCard('email')}
              {renderContactCard('phone')}
            </div>

            {contactNotice ? (
              <p className="ui-alert ui-alert--success" role="status">
                {contactNotice}
              </p>
            ) : null}
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
