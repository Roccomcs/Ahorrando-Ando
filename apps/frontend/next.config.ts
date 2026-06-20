import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // unsafe-inline necesario para Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'} https://fcm.googleapis.com`,
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Para build de Android (Capacitor) correr con NEXT_OUTPUT=export
  ...(process.env.NEXT_OUTPUT === 'export' ? { output: 'export' } : {}),
  // Los headers no se aplican en modo static export
  ...(process.env.NEXT_OUTPUT !== 'export'
    ? {
        headers: async () => [
          {
            source: '/(.*)',
            headers: securityHeaders,
          },
        ],
      }
    : {}),
}

export default nextConfig
