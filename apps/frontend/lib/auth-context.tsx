'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { api, setCookie, clearAuthCookies } from './api'
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
    api
      .get<User>('/api/v1/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post<TokenPair>('/api/v1/auth/login', { email, password })
    setTokens(data)
    const me = await api.get<User>('/api/v1/auth/me')
    setUser(me.data)
  }

  async function register(email: string, password: string) {
    const { data } = await api.post<TokenPair>('/api/v1/auth/register', { email, password })
    setTokens(data)
    const me = await api.get<User>('/api/v1/auth/me')
    setUser(me.data)
  }

  async function logout() {
    try {
      const refreshToken = document.cookie.match(/refresh_token=([^;]+)/)?.[1]
      if (refreshToken) {
        await api.post('/api/v1/auth/logout', { refresh_token: decodeURIComponent(refreshToken) })
      }
    } catch {
      // ignorar errores al cerrar sesión
    } finally {
      clearAuthCookies()
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

function setTokens(tokens: TokenPair) {
  setCookie('access_token', tokens.access_token, 1 / 24)
  // El refresh token se setea como httpOnly desde el Route Handler
  // Acá lo ponemos también para el interceptor de refresh
  setCookie('refresh_token', tokens.refresh_token, 30)
}
