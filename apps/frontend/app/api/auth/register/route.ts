import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const backendRes = await fetch(`${BACKEND}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await backendRes.json()

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status })
  }

  // No seteamos cookie ni token — el usuario debe verificar su email primero.
  // Los tokens se emiten recién en /api/auth/verify-email.
  return NextResponse.json({ ok: true })
}
