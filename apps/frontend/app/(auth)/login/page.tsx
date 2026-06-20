'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { Card } from '@/components/ds/Card'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28, textDecoration: 'none', color: 'inherit' }}>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <path d="M20 4 A16 16 0 0 1 36 20" stroke="#41A4EF" strokeWidth="4" strokeLinecap="round"/>
            <path d="M36 20 A16 16 0 0 1 20 36" stroke="#E8C268" strokeWidth="4" strokeLinecap="round"/>
            <path d="M20 36 A16 16 0 0 1 4 20 A16 16 0 0 1 20 4" stroke="#3DD993" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', fontSize: 22 }}>
            Ahorrando <span style={{ color: 'var(--text-3)' }}>Ando</span>
          </span>
        </a>

        <Card padding="lg" raised>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px' }}>
            Entrá a tu portfolio
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
            Todo tu patrimonio, en un solo lugar.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Email" type="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            {error && (
              <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>
                {error}
              </div>
            )}
            <Button type="submit" size="lg" full disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginTop: 18 }}>
          ¿No tenés cuenta?{' '}
          <Link href="/register" style={{ color: 'var(--text-accent)', fontWeight: 'var(--weight-medium)' }}>Registrate</Link>
        </p>
      </div>
    </div>
  )
}
