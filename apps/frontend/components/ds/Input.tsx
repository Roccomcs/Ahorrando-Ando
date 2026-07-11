'use client'
import { InputHTMLAttributes, useId, useState } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  mono?: boolean
}

// El contenedor es un <div> y el label se asocia por htmlFor: si fuera un
// <label> envolviendo también al botón del ojo, al hacer click en el ojo el
// label re-dispara el click sobre el input y el toggle se cancela solo (la
// contraseña nunca se revelaba).
export function Input({ label, type = 'text', error, hint, mono, className = '', id, ...rest }: Props) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const autoId = useId()
  const inputId = id ?? autoId
  const cls = `aa-input${error ? ' aa-input--error' : ''}${mono ? ' aa-input--mono' : ''}${isPassword ? ' aa-input--with-eye' : ''} ${className}`.trim()

  return (
    <div className="aa-field">
      {label && <label className="aa-field__label" htmlFor={inputId}>{label}</label>}
      <span className="aa-field__wrap">
        <input id={inputId} className={cls} type={isPassword && show ? 'text' : type} {...rest} />
        {isPassword && (
          <button
            type="button"
            className="aa-field__eye"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShow(s => !s)}
          >
            {show ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </span>
      {error
        ? <span className="aa-field__msg aa-field__msg--error">{error}</span>
        : hint
        ? <span className="aa-field__msg">{hint}</span>
        : null}
    </div>
  )
}
