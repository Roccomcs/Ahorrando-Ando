import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Audiowide, Noto_Serif, Cantarell, JetBrains_Mono } from 'next/font/google'

const audiowide = Audiowide({
  weight: '400',
  subsets: ['latin'],
  variable: '--ff-display',
})

const notoSerif = Noto_Serif({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--ff-serif',
})

const cantarell = Cantarell({
  weight: ['400', '700'],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-theme="dark"
      className={`${audiowide.variable} ${notoSerif.variable} ${cantarell.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
