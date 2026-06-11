import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function POST() {
  const store = await cookies()
  const refreshToken = store.get('refresh_token')?.value

  if (!refreshToken) {
    return NextResponse.json({ error: 'no_refresh_token' }, { status: 401 })
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      const response = NextResponse.json({ error: 'refresh_failed' }, { status: 401 })
      response.cookies.delete('refresh_token')
      response.cookies.delete('access_token')
      return response
    }

    const data = await res.json()
    const response = NextResponse.json({ access_token: data.access_token })

    response.cookies.set('access_token', data.access_token, {
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 3600, // 1h
      path: '/',
    })
    response.cookies.set('refresh_token', data.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 86400, // 30d
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'network_error' }, { status: 502 })
  }
}
