import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que nunca necesitan token (landing + auth)
const PUBLIC_PATHS = ['/', '/login', '/register', '/verify-email', '/oauth-callback', '/forgot-password', '/reset-password', '/privacy', '/terms']
// Rutas de auth que redirigen al dashboard si ya tenés sesión
const AUTH_PATHS = ['/login', '/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  // El refresh_token es httpOnly — solo accesible en el servidor (middleware/route handlers)
  // El access_token vive en memoria del cliente, no en cookie
  const hasToken = request.cookies.has('refresh_token')

  // Ruta protegida sin sesión → login
  if (!isPublic && !hasToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Página de auth con sesión activa → dashboard
  if (isAuthPage && hasToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
