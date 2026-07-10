import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function GET() {
  return NextResponse.redirect(`${BACKEND_URL}/api/v1/auth/google`)
}
