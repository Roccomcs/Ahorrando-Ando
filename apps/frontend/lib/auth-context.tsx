'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { api } from './api'
import { refreshAccessToken } from './refresh'
import { tokenStore } from './token-store'
import type { User, TokenPair } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  /** true cuando terminó el refresh de bootstrap (haya o no sesión). Las queries
   *  autenticadas esperan esto para no salir sin token y comerse un 401. */
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const UNVERIFIED_REDIRECT = '/verify-email'
const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/oauth-callback', '/']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // refreshAccessToken deduplica llamadas concurrentes (ver lib/refresh.ts):
    // si un request de datos dispara el refresh del interceptor al mismo
    // tiempo, ambos comparten la misma promesa y la rotación no rompe sesión.
    refreshAccessToken()
      .then(async (token) => {
        // Habilitamos las queries apenas hay token, sin esperar a /auth/me.
        setReady(true)
        if (!token) return
        const me = await api.get<User>('/api/v1/auth/me')
        setUser(me.data)
      })
      .catch(() => {})
      .finally(() => { setReady(true); setLoading(false) })
  }, [])

  // Redirigir a /verify-email si el usuario no verificó su email
  useEffect(() => {
    if (loading) return
    if (!user) return
    if (!user.email_verified && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
      router.replace(`${UNVERIFIED_REDIRECT}?email=${encodeURIComponent(user.email)}`)
    }
  }, [user, loading, pathname, router])

  async function login(email: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail ?? 'Error al iniciar sesión')
    }
    const data: Pick<TokenPair, 'access_token'> = await res.json()
    tokenStore.set(data.access_token)
    const me = await api.get<User>('/api/v1/auth/me')
    setUser(me.data)
  }

  async function register(email: string, password: string) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail ?? 'Error al crear la cuenta')
    }
    // No seteamos token ni user — el usuario debe verificar email primero.
    // Los tokens se emiten en /verify-email al confirmar el código.
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: tokenStore.get()
          ? { Authorization: `Bearer ${tokenStore.get()}` }
          : {},
      })
    } catch {
      // ignorar errores al cerrar sesión
    } finally {
      tokenStore.set(null)
      setUser(null)
      window.location.href = '/login'
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, ready, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
