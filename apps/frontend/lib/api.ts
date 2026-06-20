import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Inyecta el access token desde cookies en cada request
api.interceptors.request.use((config) => {
  if (typeof document !== 'undefined') {
    const token = getCookie('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// En 401 intenta refrescar el token una sola vez
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
      const refreshToken = getCookie('refresh_token')
      if (!refreshToken) throw new Error('no_refresh_token')
      const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) throw new Error('refresh_failed')
      const data = await res.json()
      const newToken: string = data.access_token
      setCookie('access_token', newToken, 1 / 24) // 1 hora
      processQueue(null, newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (err) {
      processQueue(err, null)
      clearAuthCookies()
      // Evitar loop si ya estamos en /login o /register
      const publicPaths = ['/', '/login', '/register']
      const isPublic = publicPaths.some(p => window.location.pathname === p || window.location.pathname.startsWith(p + '/'))
      if (typeof window !== 'undefined' && !isPublic) {
        window.location.href = '/login'
      }
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

// ---- helpers de cookie ----

export function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

export function clearAuthCookies() {
  document.cookie = 'access_token=; Max-Age=0; path=/'
  document.cookie = 'refresh_token=; Max-Age=0; path=/'
}
