'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AuthShell } from '@/components/auth/AuthShell'
import { PillInput } from '@/components/auth/PillInput'
import a from '@/components/auth/AuthShell.module.css'

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

function MailIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
}

function LockIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
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

  // Errores que llegan por query param desde el flujo de OAuth
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error')
    if (err === 'oauth_unconfigured') {
      setError('El inicio de sesión con Google no está disponible por ahora. Usá email y contraseña.')
    } else if (err === 'oauth_failed') {
      setError('No se pudo iniciar sesión con Google. Probá de nuevo.')
    } else if (err === 'too_many_attempts') {
      setError('Demasiados intentos fallidos. Entrá de nuevo para pedir un código nuevo.')
    }
  }, [])

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
      footer={
        <>
          <p className={a.signup}>¿No tenés cuenta? <Link href="/register">Registrate</Link></p>
          <div className={a.legal}>
            <Link href="/privacy">Privacidad</Link>
            <Link href="/terms">Términos</Link>
          </div>
        </>
      }
    >
      <Link href="/api/auth/google" style={{ textDecoration: 'none' }}>
        <button type="button" className={a.gbtn}>
          <GoogleIcon />
          Continuar con Google
        </button>
      </Link>

      <div className={a.sep}><span>o</span></div>

      <form onSubmit={handleSubmit}>
        <PillInput leftIcon={<MailIcon />} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        <PillInput leftIcon={<LockIcon />} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        <div className={a.forgot}><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link></div>
        {error && (
          <div className={a.errorBox}>
            {error}
            {showResend && !resendSent && (
              <button type="button" onClick={handleResend}>Reenviar código de verificación →</button>
            )}
          </div>
        )}
        <button type="submit" className={a.submit} disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}
