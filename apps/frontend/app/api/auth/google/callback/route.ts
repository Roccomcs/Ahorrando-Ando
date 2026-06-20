import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const at = req.nextUrl.searchParams.get('at')
  const rt = req.nextUrl.searchParams.get('rt')

  if (!at || !rt) {
    return NextResponse.redirect(new URL('/login?error=oauth_failed', req.url))
  }

  const res = NextResponse.redirect(new URL(`/oauth-callback?at=${encodeURIComponent(at)}`, req.url))

  res.cookies.set('refresh_token', rt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return res
}
