import { tokenStore } from './token-store'

/**
 * Refresh deduplicado: el backend rota el refresh token en cada uso (el viejo
 * queda blacklisteado), así que dos llamadas concurrentes con la misma cookie
 * matan la sesión — la segunda llega con un token ya inválido. Todo el código
 * (bootstrap de AuthProvider + interceptor 401 de axios) debe pasar por acá
 * para compartir una única promesa en vuelo.
 */
let inflight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = fetch('/api/auth/refresh', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) return null
        const data = await res.json()
        const token: string = data.access_token
        tokenStore.set(token)
        return token
      })
      .catch(() => null)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}
