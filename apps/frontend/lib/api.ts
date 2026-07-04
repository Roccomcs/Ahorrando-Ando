import axios from 'axios'
import { refreshAccessToken } from './refresh'
import { tokenStore } from './token-store'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inyecta el access token (en memoria) en cada request al backend
api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// En 401 intenta refrescar via Next.js API route (que usa cookie httpOnly)
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      // refreshAccessToken deduplica: si el bootstrap de AuthProvider ya está
      // refrescando, se comparte esa promesa (la rotación invalida el token
      // viejo, dos refresh paralelos matarían la sesión).
      const newToken = await refreshAccessToken()
      if (!newToken) throw new Error('refresh_failed')
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (err) {
      processQueue(err, null)
      tokenStore.set(null)
      if (typeof window !== 'undefined') {
        const publicPaths = ['/', '/login', '/register']
        const isPublic = publicPaths.some(
          (p) => window.location.pathname === p || window.location.pathname.startsWith(p + '/')
        )
        if (!isPublic) window.location.href = '/login'
      }
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)
