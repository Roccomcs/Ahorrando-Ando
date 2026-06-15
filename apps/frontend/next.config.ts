import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Para build de Android (Capacitor) correr con NEXT_OUTPUT=export
  ...(process.env.NEXT_OUTPUT === 'export' ? { output: 'export' } : {}),
}

export default nextConfig
