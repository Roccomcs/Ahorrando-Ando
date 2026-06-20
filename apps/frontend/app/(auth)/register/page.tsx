'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { Card } from '@/components/ds/Card'

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
    if (password.length < 8) errs.password = 'Mínimo 8 caracteres'
    if (password2 !== password) errs.password2 = 'Las contraseñas no coinciden'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await register(email, password)
      router.push('/dashboard')
    } catch {
      setErrors({ form: 'No se pudo crear la cuenta' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <path d="M20 4 A16 16 0 0 1 36 20" stroke="#41A4EF" strokeWidth="4" strokeLinecap="round"/>
            <path d="M36 20 A16 16 0 0 1 20 36" stroke="#E8C268" strokeWidth="4" strokeLinecap="round"/>
            <path d="M20 36 A16 16 0 0 1 4 20 A16 16 0 0 1 20 4" stroke="#3DD993" strokeWidth="4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', fontSize: 22 }}>
            Ahorrando <span style={{ color: 'var(--text-3)' }}>Ando</span>
          </span>
        </div>

        <Card padding="lg" raised>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px' }}>
            Creá tu cuenta
          </h1>
          <p style={{ margin: '0 0 20px', fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
            Gratis. Conectás tus cuentas y listo.
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Email" type="email" placeholder="vos@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} error={errors.email} autoComplete="email" required />
            <Input label="Contraseña" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} error={errors.password} hint={!errors.password ? 'Mínimo 8 caracteres' : undefined} autoComplete="new-password" required />
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
      </div>
    </div>
  )
}
