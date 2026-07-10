'use client'

import { useId, useState, ReactNode } from 'react'
import s from './PillInput.module.css'

interface Props {
  leftIcon: ReactNode
  type?: string
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoComplete?: string
  required?: boolean
  error?: string
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 0 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
  )
}

export function PillInput({ leftIcon, type = 'text', placeholder, value, onChange, autoComplete, required, error }: Props) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  const inputType = isPw ? (show ? 'text' : 'password') : type
  const errId = useId()

  return (
    <div className={s.wrap}>
      <div className={s.field}>
        <span className={s.lead} aria-hidden>{leftIcon}</span>
        {/* El placeholder desaparece al tipear, así que no sirve de nombre
            accesible: el aria-label es el que queda. */}
        <input
          className={`${s.input} ${error ? s.inputError : ''}`}
          type={inputType}
          aria-label={placeholder}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
        />
        {isPw && (
          <button type="button" className={s.toggle} onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <EyeIcon off={show} />
          </button>
        )}
      </div>
      {error && <p id={errId} className={s.errText}>{error}</p>}
    </div>
  )
}
