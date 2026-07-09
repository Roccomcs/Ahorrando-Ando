'use client'

import { ReactNode, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)
import { AppLogo } from '@/components/ds/AppLogo'
import s from './AuthShell.module.css'

// three + los .glb solo se descargan en el cliente y fuera del bundle inicial:
// el formulario es interactivo aunque la escena todavía no haya cargado.
const LogoRain = dynamic(() => import('./LogoRain').then(m => m.LogoRain), { ssr: false })

interface Props {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const card = `.${s.card}`
    const items = `.${s.card} > *`

    // Animación de entrada: la tarjeta cae como un panel angosto, se expande en
    // vertical y luego en horizontal; el contenido aparece en stagger.
    // Es una entrada decorativa y deliberadamente se muestra siempre (también con
    // "reduce motion" del sistema), porque es parte de la identidad del login.
    const tl = gsap.timeline()
    tl.fromTo(card,
      { y: -560, scaleX: 0.2, scaleY: 0.5, opacity: 0 },
      { y: 0, scaleX: 0.2, scaleY: 0.5, opacity: 1, duration: 1.1, ease: 'power3.out' },
    )
      .to(card, { scaleY: 1, duration: 0.5, ease: 'power3.out' }, '-=0.25')
      .to(card, { scaleX: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }, '-=0.15')

    gsap.from(items, {
      opacity: 0, y: -30, ease: 'power2.out', duration: 0.9,
      delay: 1.35, stagger: 0.12, clearProps: 'all',
    })
  }, { scope: root })

  return (
    <div className={s.wrap} ref={root}>
      <div className={s.aurora} aria-hidden="true">
        <div className={`${s.blob} ${s.b1}`} />
        <div className={`${s.blob} ${s.b2}`} />
      </div>

      <LogoRain />

      <Link href="/" className={s.back} aria-label="Volver al inicio">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
        </svg>
      </Link>

      <main className={s.shell}>
        <div className={s.card}>
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
        </div>
      </main>
    </div>
  )
}
