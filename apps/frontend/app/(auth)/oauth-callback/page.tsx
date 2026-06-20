'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { tokenStore } from '@/lib/token-store'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const at = params.get('at')
    if (at) {
      tokenStore.set(at)
      // Limpiar token de la URL antes de redirigir
      router.replace('/dashboard')
    } else {
      router.replace('/login?error=oauth_failed')
    }
  }, [params, router])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}>Iniciando sesión…</p>
    </div>
  )
}
