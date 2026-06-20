import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value
  const authHeader = req.headers.get('Authorization')

  // Intentar revocar el token en el backend (best effort)
  if (refreshToken && authHeader) {
    try {
      await fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // Si el backend no responde, igual limpiamos la cookie local
    }
  }

  const res = NextResponse.json({ detail: 'Sesión cerrada' })
  res.cookies.delete('refresh_token')
  return res
}
