'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { AuthShell } from '@/components/auth/AuthShell'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>o</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setShowResend(false)
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = (err as Error).message ?? ''
      if (msg === 'email_not_verified') {
        setError('Tu email no está verificado.')
        setShowResend(true)
      } else {
        setError('Email o contraseña incorrectos')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setResendSent(true)
    router.push(`/verify-email?email=${encodeURIComponent(email)}`)
  }

  return (
    <AuthShell
      title="Entrá a tu portfolio"
      subtitle="Todo tu patrimonio, en un solo lugar."
      brandTitle="Toda tu plata, en una única aplicación."
      brandText="Exchanges, brokers y billeteras virtuales, juntas en pesos y dólares."
      footer={
        <>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
            ¿No tenés cuenta?{' '}
            <Link href="/register" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Registrate</Link>
          </p>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 16, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Privacidad</Link>
            <Link href="/terms" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Términos</Link>
          </p>
        </>
      }
    >
      <Link href="/api/auth/google" style={{ textDecoration: 'none', display: 'block' }}>
        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '11px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--surface-raised)', border: '1px solid var(--border-2)',
          color: 'var(--text-1)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
          cursor: 'pointer', transition: 'background 130ms', fontFamily: 'var(--font-ui)',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </Link>

      <Divider />

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email" type="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        <div>
          <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link href="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-accent)', textDecoration: 'none' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
        {error && (
          <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>
            {error}
            {showResend && !resendSent && (
              <button onClick={handleResend} style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: 'var(--text-accent)', fontSize: 'var(--text-sm)', cursor: 'pointer', padding: 0, fontWeight: 'var(--weight-medium)' }}>
                Reenviar código de verificación →
              </button>
            )}
          </div>
        )}
        <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthShell>
  )
}
