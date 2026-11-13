import type { ChangeEvent, ClipboardEvent } from 'react'

const OTP_LENGTH = 6

type OtpInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  describedBy?: string
  invalid?: boolean
  autoFocus?: boolean
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, OTP_LENGTH)
}

export function OtpInput({
  id = 'otp',
  value,
  onChange,
  describedBy,
  invalid = false,
  autoFocus = false,
}: OtpInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(digitsOnly(event.target.value))
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    onChange(digitsOnly(event.clipboardData.getData('text')))
  }

  const slots = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '')

  return (
    <div className="ui-otp">
      <div className="ui-otp__slots" aria-hidden="true">
        {slots.map((digit, index) => (
          <span
            key={index}
            className={
              digit
                ? 'ui-otp__slot ui-otp__slot--filled'
                : index === value.length
                  ? 'ui-otp__slot ui-otp__slot--active'
                  : 'ui-otp__slot'
            }
          >
            {digit}
          </span>
        ))}
      </div>
      <input
        id={id}
        name="otp"
        className="ui-otp__input"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        pattern="\d{6}"
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      />
    </div>
  )
}
