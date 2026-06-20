'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api } from './api'
import { tokenStore } from './token-store'
import type { User, TokenPair } from './types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Al cargar la app, intentar renovar el access token usando el refresh_token httpOnly
    // Si no hay refresh_token (cookie), la ruta devuelve 401 y no hay sesión.
    fetch('/api/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        tokenStore.set(data.access_token)
        const me = await api.get<User>('/api/v1/auth/me')
        setUser(me.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
    const data: Pick<TokenPair, 'access_token'> = await res.json()
    tokenStore.set(data.access_token)
    const me = await api.get<User>('/api/v1/auth/me')
    setUser(me.data)
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
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
