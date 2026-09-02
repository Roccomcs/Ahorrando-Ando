import { NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const IS_PROD = process.env.NODE_ENV === 'production'

export async function POST() {
  const backendRes = await fetch(`${BACKEND}/api/v1/auth/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  const data = await backendRes.json()
  if (!backendRes.ok) return NextResponse.json(data, { status: backendRes.status })

  const res = NextResponse.json({ access_token: data.access_token })
  res.cookies.set('refresh_token', data.refresh_token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
