import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { OtpInput } from '@/components/OtpInput'
import { api, isApiError, type Profile } from '@/lib/api'
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

type ContactAction =
  | { type: 'confirm'; channel: ContactChannel }
  | { type: 'replace'; channel: ContactChannel; nextValue: string }

const emptyPassword: PasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
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

function clearConfirmCopy(
  channel: ContactChannel,
  value: string,
): { title: string; text: string } {
  if (channel === 'email') {
    return {
      title: 'Очистить почту?',
      text: `Адрес ${value} будет удалён.`,
    }
  }
  return {
    title: 'Очистить телефон?',
    text: `Номер ${value} будет удалён.`,
  }
}

function generalFromProfile(profile: Profile): GeneralForm {
  return {
    login: profile.login,
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
  }
}

export function ProfilePage() {
  const navigate = useNavigate()
  const baseId = useId()
  const [tab, setTab] = useState<ProfileTab>('general')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [general, setGeneral] = useState<GeneralForm>({
    login: '',
    firstName: '',
    lastName: '',
  })
  const [generalErrors, setGeneralErrors] = useState<{ login?: string }>({})
  const [password, setPassword] = useState<PasswordForm>(emptyPassword)
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [generalSaved, setGeneralSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [offerPasswordRecovery, setOfferPasswordRecovery] = useState(false)
  const [bindNotice, setBindNotice] = useState<string | null>(null)
  const [contactNotice, setContactNotice] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<ContactAction | null>(null)
  const [pendingClear, setPendingClear] = useState<ContactChannel | null>(null)
  const clearDialogRef = useRef<HTMLDialogElement>(null)
  const clearCancelRef = useRef<HTMLButtonElement>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)
  const [draftEmail, setDraftEmail] = useState('')
  const [draftPhone, setDraftPhone] = useState('')
  const [draftErrors, setDraftErrors] = useState<{
    email?: string
    phone?: string
  }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const dialog = clearDialogRef.current
    if (!dialog) return
    if (pendingClear && !dialog.open) {
      dialog.showModal()
      clearCancelRef.current?.focus()
    } else if (!pendingClear && dialog.open) {
      dialog.close()
    }
  }, [pendingClear])

  const tabIds = {
    general: `${baseId}-tab-general`,
    security: `${baseId}-tab-security`,
  }
  const panelIds = {
    general: `${baseId}-panel-general`,
    security: `${baseId}-panel-security`,
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await api<Profile>('/profile')
        if (cancelled) return
        setProfile(data)
        setGeneral(generalFromProfile(data))
      } catch (error) {
        if (cancelled) return
        if (isApiError(error) && error.status === 401) {
          navigate('/login', { replace: true })
          return
        }
        setLoadError(
          isApiError(error) ? error.message : 'Не удалось загрузить профиль.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const applyProfile = (data: Profile) => {
    setProfile(data)
    setGeneral(generalFromProfile(data))
  }

  const unverifiedChannel = useMemo((): ContactChannel | null => {
    if (!profile) return null
    if (profile.email && !profile.emailVerified) return 'email'
    if (profile.phone && !profile.phoneVerified) return 'phone'
    return null
  }, [profile])

  const canClear = (channel: ContactChannel): boolean => {
    if (!profile) return false
    const value = channel === 'email' ? profile.email : profile.phone
    const verified =
      channel === 'email' ? profile.emailVerified : profile.phoneVerified
    if (!value) return false
    if (!verified) return true
    const otherValue = channel === 'email' ? profile.phone : profile.email
    const otherVerified =
      channel === 'email' ? profile.phoneVerified : profile.emailVerified
    return Boolean(otherValue && otherVerified)
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
      if (field === 'currentPassword') setOfferPasswordRecovery(false)
      setPasswordErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        if (field === 'newPassword' || field === 'confirmPassword') {
          delete next.confirmPassword
        }
        return next
      })
    }

  const handleGeneralSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const loginErr = loginErrorMessage(general.login)
    if (loginErr) {
      setGeneralErrors({ login: loginErr })
      return
    }
    setSubmitting(true)
    setContactNotice(null)
    setBindNotice(null)
    try {
      const data = await api<Profile>('/profile', {
        method: 'PATCH',
        body: {
          login: normalizeLogin(general.login),
          firstName: general.firstName,
          lastName: general.lastName,
        },
      })
      applyProfile(data)
      setGeneralSaved(true)
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (isApiError(error) && error.fields?.includes('login')) {
        setGeneralErrors({ login: error.message })
      } else {
        setLoadError(
          isApiError(error) ? error.message : 'Не удалось сохранить данные.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: typeof passwordErrors = {}
    if (!password.currentPassword) {
      next.currentPassword = 'Введите текущий пароль.'
    }
    if (!password.newPassword) next.newPassword = 'Введите новый пароль.'
    if (!password.confirmPassword) {
      next.confirmPassword = 'Подтвердите пароль.'
    } else if (password.newPassword !== password.confirmPassword) {
      next.confirmPassword = 'Пароли не совпадают.'
    }
    setPasswordErrors(next)
    setOfferPasswordRecovery(false)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    setBindNotice(null)
    try {
      const [currentPasswordHash, nextPasswordHash] = await Promise.all([
        sha256Hex(password.currentPassword),
        sha256Hex(password.newPassword),
      ])
      const data = await api<Profile>('/profile/password', {
        method: 'POST',
        body: { currentPasswordHash, nextPasswordHash },
      })
      applyProfile(data)
      setPassword(emptyPassword)
      setPasswordSaved(true)
    } catch (error) {
      if (isApiError(error) && error.code === 'invalid_credentials') {
        setPasswordErrors({
          currentPassword: error.message || 'Неверный текущий пароль',
        })
        setOfferPasswordRecovery(true)
        return
      }
      if (isApiError(error) && error.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setPasswordErrors({
        currentPassword: isApiError(error)
          ? error.message
          : 'Не удалось сменить пароль.',
      })
    } finally {
      setSubmitting(false)
    }
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
    setContactError(null)
  }

  const startReplace = async (channel: ContactChannel) => {
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

    setSubmitting(true)
    setContactError(null)
    try {
      if (channel === 'email') {
        await api('/profile/email', {
          method: 'POST',
          body: { email: nextValue },
        })
      } else {
        await api('/profile/phone', {
          method: 'POST',
          body: { phone: nextValue },
        })
      }
      setPendingAction({ type: 'replace', channel, nextValue })
      setOtp('')
      setOtpError(null)
      setContactNotice(null)
      setDraftErrors((prev) => {
        const next = { ...prev }
        delete next[channel]
        return next
      })
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setDraftErrors((prev) => ({
        ...prev,
        [channel]: isApiError(error)
          ? error.message
          : 'Не удалось начать замену.',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmClear = async () => {
    if (!pendingClear) return
    await clearContact(pendingClear)
    setPendingClear(null)
  }

  const clearContact = async (channel: ContactChannel) => {
    if (!canClear(channel)) return
    setSubmitting(true)
    setContactError(null)
    try {
      const data = await api<Profile>(
        channel === 'email' ? '/profile/email' : '/profile/phone',
        { method: 'DELETE' },
      )
      applyProfile(data)
      setContactNotice(
        channel === 'email' ? 'Почта удалена.' : 'Телефон удалён.',
      )
      setPendingAction(null)
      setOtp('')
      setOtpError(null)
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setContactError(
        isApiError(error) ? error.message : 'Не удалось очистить контакт.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleContactOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pendingAction) return
    setOtpError(null)
    setSubmitting(true)
    try {
      let data: Profile
      if (pendingAction.type === 'confirm') {
        data = await api<Profile>('/profile/contact/confirm', {
          method: 'POST',
          body: { channel: pendingAction.channel, code: otp },
        })
        setContactNotice(
          pendingAction.channel === 'email'
            ? 'Почта подтверждена.'
            : 'Телефон подтверждён.',
        )
      } else if (pendingAction.channel === 'email') {
        data = await api<Profile>('/profile/email/confirm', {
          method: 'POST',
          body: { code: otp },
        })
        setDraftEmail('')
        setContactNotice('Почта обновлена.')
      } else {
        data = await api<Profile>('/profile/phone/confirm', {
          method: 'POST',
          body: { code: otp },
        })
        setDraftPhone('')
        setContactNotice('Телефон обновлён.')
      }
      applyProfile(data)
      setPendingAction(null)
      setOtp('')
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      setOtpError(
        isApiError(error) ? error.message : 'Не удалось подтвердить код.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const selectTab = (next: ProfileTab) => {
    setTab(next)
  }

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Still leave the UI even if logout request fails.
    }
    navigate('/login')
  }

  const goToPasswordRecovery = async () => {
    setSubmitting(true)
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Recovery does not need the profile session.
    }
    navigate('/forgot-password')
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
    if (!profile) return null
    const value = channel === 'email' ? profile.email : profile.phone
    const verified =
      channel === 'email' ? profile.emailVerified : profile.phoneVerified
    const draft = channel === 'email' ? draftEmail : draftPhone
    const draftError = draftErrors[channel]
    const hasValue = Boolean(value)
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
              : verified
                ? 'Подтверждён'
                : 'Не подтверждён'}
          </span>
        </div>

        <p className="ui-contact__value">{value ?? '—'}</p>

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
                onChange={(next) => {
                  setOtp(next)
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
              <button
                type="submit"
                className="ui-button ui-button--solid ui-button--sm"
                disabled={submitting}
              >
                Подтвердить код
              </button>
              <button
                type="button"
                className="ui-button ui-button--ghost ui-button--sm"
                disabled={submitting}
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
                disabled={submitting}
                onClick={() => {
                  void startReplace(channel)
                }}
              >
                {hasValue ? 'Заменить' : 'Добавить'}
              </button>
              {hasValue && !verified ? (
                <button
                  type="button"
                  className="ui-button ui-button--outline ui-button--sm"
                  disabled={submitting}
                  onClick={() => startConfirm(channel)}
                >
                  Подтвердить
                </button>
              ) : null}
              {hasValue ? (
                <button
                  type="button"
                  className="ui-button ui-button--ghost ui-button--sm"
                  disabled={!clearAllowed || submitting}
                  aria-describedby={
                    !clearAllowed ? `profile-clear-${channel}-hint` : undefined
                  }
                  onClick={() => {
                    setPendingClear(channel)
                    const dialog = clearDialogRef.current
                    if (dialog && pendingClear === channel && !dialog.open) {
                      dialog.showModal()
                      clearCancelRef.current?.focus()
                    }
                  }}
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

  if (loading) {
    return (
      <div className="ui-settings-shell">
        <div className="ui-settings-stack">
          <p className="ui-text-muted">Загрузка профиля…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="ui-settings-shell">
        <div className="ui-settings-stack">
          <p className="ui-alert ui-alert--error" role="alert">
            {loadError ?? 'Профиль недоступен.'}
          </p>
          <button
            type="button"
            className="ui-button ui-button--solid"
            onClick={() => navigate('/login')}
          >
            Ко входу
          </button>
        </div>
      </div>
    )
  }

  const clearCopy =
    pendingClear && profile
      ? clearConfirmCopy(
          pendingClear,
          pendingClear === 'email' ? (profile.email ?? '') : (profile.phone ?? ''),
        )
      : null

  return (
    <div className="ui-settings-shell">
      <div className="ui-settings-stack">
        <header className="ui-settings-header">
          <h1 className="ui-settings-stack__title">Настройки профиля</h1>
          <button
            type="button"
            className="ui-button ui-button--outline"
            onClick={() => {
              void handleLogout()
            }}
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

              <button
                type="submit"
                className="ui-button ui-button--solid"
                disabled={submitting}
              >
                Сохранить
              </button>

              {generalSaved ? (
                <p className="ui-alert ui-alert--success" role="status">
                  Данные сохранены.
                </p>
              ) : null}
            </form>

            <hr className="ui-separator" />

            <h3 className="ui-settings-block__title">Контакты</h3>

            {unverifiedChannel && profile.unverifiedExpiresAt ? (
              <p className="ui-alert ui-alert--info" role="status">
                {channelTitle(unverifiedChannel)} не подтверждён до{' '}
                {formatExpiry(profile.unverifiedExpiresAt)}.
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
            {contactError ? (
              <p className="ui-alert ui-alert--error" role="alert">
                {contactError}
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
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                  aria-describedby={
                    passwordErrors.currentPassword
                      ? 'profile-current-password-error'
                      : undefined
                  }
                />
                {passwordErrors.currentPassword && !offerPasswordRecovery ? (
                  <p
                    id="profile-current-password-error"
                    className="ui-field__error"
                    role="alert"
                  >
                    {passwordErrors.currentPassword}
                  </p>
                ) : null}
                {offerPasswordRecovery && passwordErrors.currentPassword ? (
                  <div className="ui-stack ui-stack--sm">
                    <p
                      id="profile-current-password-error"
                      className="ui-alert ui-alert--error"
                      role="alert"
                    >
                      {passwordErrors.currentPassword}
                    </p>
                    <button
                      type="button"
                      className="ui-button ui-button--outline"
                      disabled={submitting}
                      onClick={() => {
                        void goToPasswordRecovery()
                      }}
                    >
                      Восстановить пароль
                    </button>
                  </div>
                ) : null}
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
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  aria-describedby={
                    passwordErrors.newPassword
                      ? 'profile-new-password-error'
                      : undefined
                  }
                />
                {passwordErrors.newPassword ? (
                  <p
                    id="profile-new-password-error"
                    className="ui-field__error"
                    role="alert"
                  >
                    {passwordErrors.newPassword}
                  </p>
                ) : null}
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
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                  aria-describedby={
                    passwordErrors.confirmPassword
                      ? 'profile-confirm-password-error'
                      : undefined
                  }
                />
                {passwordErrors.confirmPassword ? (
                  <p
                    id="profile-confirm-password-error"
                    className="ui-field__error"
                    role="alert"
                  >
                    {passwordErrors.confirmPassword}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                className="ui-button ui-button--solid"
                disabled={submitting}
              >
                Сменить пароль
              </button>

              {passwordSaved ? (
                <p className="ui-alert ui-alert--success" role="status">
                  Пароль обновлён.
                </p>
              ) : null}
            </form>

            <hr className="ui-separator" />

            <div className="ui-stack">
              <h3 className="ui-settings-block__title">Добавить способ входа</h3>

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

      <dialog
        ref={clearDialogRef}
        className="ui-dialog"
        aria-labelledby={`${baseId}-clear-title`}
        aria-describedby={`${baseId}-clear-desc`}
        onKeyDown={(event: KeyboardEvent<HTMLDialogElement>) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          if (!submitting) setPendingClear(null)
        }}
        onCancel={(event) => {
          if (submitting) event.preventDefault()
        }}
        onClose={() => {
          setPendingClear(null)
        }}
        onClick={(event: MouseEvent<HTMLDialogElement>) => {
          if (submitting) return
          if (event.target === event.currentTarget) setPendingClear(null)
        }}
      >
        {clearCopy ? (
          <div className="ui-dialog__panel">
            <h2 id={`${baseId}-clear-title`} className="ui-dialog__title">
              {clearCopy.title}
            </h2>
            <p id={`${baseId}-clear-desc`} className="ui-dialog__text">
              {clearCopy.text}
            </p>
            <div className="ui-dialog__actions">
              <button
                ref={clearCancelRef}
                type="button"
                className="ui-button ui-button--outline"
                disabled={submitting}
                onClick={() => setPendingClear(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="ui-button ui-button--danger"
                disabled={submitting}
                onClick={() => {
                  void confirmClear()
                }}
              >
                {submitting ? 'Очистка…' : 'Очистить'}
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  )
}
