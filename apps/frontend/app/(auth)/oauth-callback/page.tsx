'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { tokenStore } from '@/lib/token-store'

function OAuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const at = params.get('at')
    if (at) {
      tokenStore.set(at)
      router.replace('/dashboard')
    } else {
      router.replace('/login?error=oauth_failed')
    }
  }, [params, router])

  return null
}

export default function OAuthCallbackPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)' }}>Iniciando sesión…</p>
      <Suspense>
        <OAuthCallbackInner />
      </Suspense>
    </div>
  )
}
