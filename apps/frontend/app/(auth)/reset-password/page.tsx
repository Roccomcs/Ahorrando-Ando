'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { AppLogo } from '@/components/ds/AppLogo'
import { tokenStore } from '@/lib/token-store'

function ResetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') ?? ''

  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

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
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) inputs.current[idx - 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { setDigits(pasted.split('')); inputs.current[5]?.focus() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = digits.join('')
    if (code.length < 6) { setError('Ingresá el código de 6 dígitos'); return }
    if (password.length < 12) { setError('La contraseña debe tener mínimo 12 caracteres'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden'); return }

    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, new_password: password }),
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
      router.replace('/dashboard')
    } catch {
      setError('Error al resetear la contraseña. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResendCooldown(60)
  }

  const digitStyle = (filled: boolean): React.CSSProperties => ({
    width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
    fontFamily: 'var(--font-mono)', background: 'var(--surface-inset)',
    border: `2px solid ${filled ? 'var(--text-accent)' : 'var(--border-2)'}`,
    borderRadius: 'var(--radius-md)', color: 'var(--text-1)', outline: 'none',
    transition: 'border-color 0.15s', caretColor: 'transparent',
  })

  return (
    <>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px' }}>
        Nueva contraseña
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
        Ingresá el código que enviamos a <strong>{email}</strong> y elegí tu nueva contraseña.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-2)', display: 'block', marginBottom: 10 }}>Código de verificación</label>
          <div style={{ display: 'flex', gap: 8 }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input key={i} ref={el => { inputs.current[i] = el }} value={d}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                maxLength={1} inputMode="numeric" style={digitStyle(!!d)}
                autoFocus={i === 0} disabled={loading} />
            ))}
          </div>
          <button type="button" onClick={handleResend} disabled={resendCooldown > 0}
            style={{ marginTop: 8, background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', fontSize: 'var(--text-xs)', color: resendCooldown > 0 ? 'var(--text-3)' : 'var(--text-accent)' }}>
            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
          </button>
        </div>

        <Input label="Nueva contraseña" type="password" placeholder="••••••••" value={password}
          onChange={e => setPassword(e.target.value)}
          hint={!error.includes('contraseña') ? 'Mínimo 12 caracteres, con letras y números' : undefined}
          autoComplete="new-password" required />
        <Input label="Repetir contraseña" type="password" placeholder="••••••••" value={password2}
          onChange={e => setPassword2(e.target.value)} autoComplete="new-password" required />

        {error && (
          <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>
            {error}
          </div>
        )}
        <Button type="submit" size="lg" full disabled={loading}>
          {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
        </Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/forgot-password" style={{
        position: 'fixed', top: 20, left: 20, width: 40, height: 40,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-card)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-2)', textDecoration: 'none',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
        </svg>
      </Link>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28, textDecoration: 'none', color: 'inherit' }}>
          <AppLogo size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', fontSize: 22 }}>
            Ahorrando <span style={{ color: 'var(--text-3)' }}>Ando</span>
          </span>
        </Link>

        <Card padding="lg" raised>
          <Suspense>
            <ResetPasswordInner />
          </Suspense>
        </Card>
      </div>
    </div>
  )
}
