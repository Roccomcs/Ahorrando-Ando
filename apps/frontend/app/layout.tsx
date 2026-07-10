import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Stack_Sans_Headline, Noto_Serif, Gelasio, JetBrains_Mono } from 'next/font/google'

const stackSans = Stack_Sans_Headline({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-display',
})

const notoSerif = Noto_Serif({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-serif',
})

const gelasio = Gelasio({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-body',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--ff-mono',
})

export const metadata: Metadata = {
  title: 'Ahorrando Ando',
  description: 'Tu portfolio financiero unificado en dólares',
}

// Sin maximumScale ni userScalable: el zoom hasta 200% es obligatorio (WCAG 1.4.4).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0F',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${stackSans.variable} ${notoSerif.variable} ${gelasio.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <a href="#main" className="aa-skip-link">Saltar al contenido</a>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
