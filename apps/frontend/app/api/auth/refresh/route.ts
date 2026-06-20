import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ detail: 'No hay sesión activa' }, { status: 401 })
  }

  const backendRes = await fetch(`${BACKEND}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    // refresh inválido → limpiar cookie
    const res = NextResponse.json(data, { status: backendRes.status })
    res.cookies.delete('refresh_token')
    return res
  }

  const { access_token, refresh_token } = data

  const res = NextResponse.json({ access_token })

  res.cookies.set('refresh_token', refresh_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return res
}
