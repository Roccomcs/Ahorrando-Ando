'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { AppLogo } from '@/components/ds/AppLogo'
import { Card } from '@/components/ds/Card'

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>o</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
    </div>
  )
}

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!/.+@.+\..+/.test(email)) errs.email = 'Ingresá un email válido'
    if (password.length < 12) errs.password = 'Mínimo 12 caracteres'
    if (password2 !== password) errs.password2 = 'Las contraseñas no coinciden'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await register(email, password)
      // Después del registro, redirigir a verificación de email
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch {
      setErrors({ form: 'No se pudo crear la cuenta' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/" style={{
        position: 'fixed', top: 20, left: 20,
        width: 40, height: 40,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-card)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-2)',
        textDecoration: 'none', transition: 'background 130ms, color 130ms, border-color 130ms',
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-card)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-2)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
        </svg>
      </Link>

      <div style={{ width: '100%', maxWidth: 400 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28, textDecoration: 'none', color: 'inherit' }}>
          <AppLogo size={32} />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', fontSize: 22 }}>
            Ahorrando <span style={{ color: 'var(--text-3)' }}>Ando</span>
          </span>
        </Link>

        <Card padding="lg" raised>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px' }}>
            Creá tu cuenta
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
            Gratis. Conectás tus cuentas y listo.
          </p>

          {/* Google OAuth */}
          <Link href="/api/auth/google" style={{ textDecoration: 'none', display: 'block', marginBottom: 16 }}>
            <button style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--surface-raised)', border: '1px solid var(--border-2)',
              color: 'var(--text-1)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
              cursor: 'pointer', transition: 'background 130ms',
              fontFamily: 'var(--font-ui)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
            >
              <GoogleIcon />
              Registrarse con Google
            </button>
          </Link>

          <Divider />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            <Input label="Email" type="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} autoComplete="email" required />
            <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} hint={!errors.password ? 'Mínimo 12 caracteres, con letras y números' : undefined} autoComplete="new-password" required />
            <Input label="Repetir contraseña" type="password" placeholder="••••••••" value={password2} onChange={e => setPassword2(e.target.value)} error={errors.password2} autoComplete="new-password" required />
            {errors.form && (
              <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>
                {errors.form}
              </div>
            )}
            <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Iniciá sesión</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginTop: 10 }}>
          Al registrarte aceptás los{' '}
          <Link href="/terms" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>Términos de uso</Link>
          {' '}y la{' '}
          <Link href="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'underline' }}>Política de privacidad</Link>
        </p>
      </div>
    </div>
  )
}
