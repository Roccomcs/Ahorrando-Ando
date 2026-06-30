import { ReactNode } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/ds/AppLogo'
import s from './AuthShell.module.css'

interface Props {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className={s.wrap}>
      <div className={s.aurora} aria-hidden="true">
        <div className={`${s.blob} ${s.b1}`} />
        <div className={`${s.blob} ${s.b2}`} />
      </div>

      <Link href="/" className={s.back} aria-label="Volver al inicio">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
        </svg>
      </Link>

      <main className={s.shell}>
        <Link href="/" className={s.brand}>
          <AppLogo size={30} />
          <span className={s.wm}>Ahorrando <span className={s.mut}>Ando</span></span>
        </Link>

        <div className={s.head}>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {children}
        {footer}
      </main>
    </div>
  )
}
