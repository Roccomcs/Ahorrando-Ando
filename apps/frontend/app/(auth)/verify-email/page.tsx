'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { tokenStore } from '@/lib/token-store'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export default function VerifyEmailPage() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Cuenta regresiva para reenvío
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  function handleDigit(idx: number, val: string) {
    const ch = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = ch
    setDigits(next)
    if (ch && idx < 5) inputs.current[idx + 1]?.focus()
    if (next.every(d => d)) submitCode(next.join(''))
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      inputs.current[5]?.focus()
      submitCode(pasted)
    }
  }

  async function submitCode(code: string) {
    if (loading) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.detail ?? 'Código inválido o expirado')
        setDigits(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
        return
      }
      const data = await res.json()
      tokenStore.set(data.access_token)
      // Actualizar el usuario en contexto
      await api.get<User>('/api/v1/auth/me')
      router.replace('/dashboard')
    } catch {
      setError('Error al verificar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    try {
      await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendCooldown(60)
      setError('')
    } catch {
      setError('No se pudo reenviar el código.')
    }
  }

  const digitStyle = (filled: boolean): React.CSSProperties => ({
    width: 48, height: 56,
    textAlign: 'center', fontSize: 24, fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    background: 'var(--surface-inset)',
    border: `2px solid ${filled ? 'var(--text-accent)' : 'var(--border-2)'}`,
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-1)',
    outline: 'none',
    transition: 'border-color 0.15s',
    caretColor: 'transparent',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28, textDecoration: 'none', color: 'inherit' }}>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <path d="M20 4 A16 16 0 0 1 36 20" stroke="#41A4EF" strokeWidth="4" strokeLinecap="round"/>
            <path d="M36 20 A16 16 0 0 1 20 36" stroke="#E8C268" strokeWidth="4" strokeLinecap="round"/>
            <path d="M20 36 A16 16 0 0 1 4 20 A16 16 0 0 1 20 4" stroke="#3DD993" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', fontSize: 22 }}>
            Ahorrando <span style={{ color: 'var(--text-3)' }}>Ando</span>
          </span>
        </Link>

        <Card padding="lg" raised>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 8px' }}>
              Verificá tu email
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
              Te enviamos un código de 6 dígitos a<br />
              <span style={{ color: 'var(--text-1)', fontWeight: 'var(--weight-medium)' }}>{email}</span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el }}
                value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                maxLength={1}
                inputMode="numeric"
                style={digitStyle(!!d)}
                autoFocus={i === 0}
                disabled={loading}
              />
            ))}
          </div>

          {error && (
            <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)', marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}

          {loading && (
            <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 'var(--text-sm)', marginBottom: 16 }}>Verificando…</p>
          )}

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: 'var(--text-sm)', color: resendCooldown > 0 ? 'var(--text-3)' : 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}
            >
              {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : '¿No recibiste el código? Reenviar'}
            </button>
          </div>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
          <Link href="/login" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
