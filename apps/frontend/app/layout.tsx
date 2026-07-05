import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Space_Grotesk, Manrope } from 'next/font/google'

// Design System v2 (Claude Design): Space Grotesk para display + números
// tabulares, Manrope para body/labels.
const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-display',
})

const manrope = Manrope({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--ff-body',
})

export const metadata: Metadata = {
  title: 'Ahorrando Ando',
  description: 'Tu portfolio financiero unificado en dólares',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${spaceGrotesk.variable} ${manrope.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
