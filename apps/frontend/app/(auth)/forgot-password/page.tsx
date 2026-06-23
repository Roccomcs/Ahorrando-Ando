'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/.+@.+\..+/.test(email)) { setError('Ingresá un email válido'); return }
    setError('')
    setLoading(true)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Error al enviar el código. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <Card padding="lg" raised>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', margin: '0 0 8px' }}>Revisá tu email</h2>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 24px' }}>
                Si <strong>{email}</strong> tiene una cuenta, te enviamos un código para resetear tu contraseña.
              </p>
              <Button full onClick={() => router.push(`/reset-password?email=${encodeURIComponent(email)}`)}>
                Ingresar el código →
              </Button>
            </div>
          </Card>
          <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
            <Link href="/login" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Volver al inicio de sesión</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Link href="/login" style={{
        position: 'fixed', top: 20, left: 20, width: 40, height: 40,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-card)', border: '1px solid var(--border-2)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-2)', textDecoration: 'none',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
        </svg>
      </Link>

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px' }}>
            ¿Olvidaste tu contraseña?
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
            Ingresá tu email y te mandamos un código para crear una nueva.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Email" type="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            {error && (
              <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>
                {error}
              </div>
            )}
            <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
          <Link href="/login" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Volver al inicio de sesión</Link>
        </p>
      </div>
    </div>
  )
}
