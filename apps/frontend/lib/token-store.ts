/**
 * Almacena el access token en memoria (no en cookies ni localStorage).
 * El refresh token vive en una cookie httpOnly seteada por el servidor.
 */

let _accessToken: string | null = null
let _onTokenChange: ((token: string | null) => void) | null = null

export const tokenStore = {
  get: () => _accessToken,
  set: (token: string | null) => {
    _accessToken = token
    _onTokenChange?.(token)
  },
  onTokenChange: (cb: (token: string | null) => void) => {
    _onTokenChange = cb
  },
}
