'use client'

import { useEffect, useRef, ReactNode } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { AppLogo } from '@/components/ds/AppLogo'
import s from './AuthShell.module.css'

interface Props {
  title: string
  subtitle: string
  brandTitle: string
  brandText: string
  children: ReactNode
  footer: ReactNode
}

export function AuthShell({ title, subtitle, brandTitle, brandText, children, footer }: Props) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(`.${s.brand}`, { xPercent: -4, autoAlpha: 0, duration: 0.7 })
        .from(`.${s.brandInner} > *`, { y: 22, autoAlpha: 0, duration: 0.5, stagger: 0.1 }, '-=0.35')
        .from(`.${s.formCard} > *`, { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, '-=0.5')
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className={s.wrap} ref={root}>
      <Link href="/" className={s.back} aria-label="Volver al inicio">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
        </svg>
      </Link>

      <div className={s.brand}>
        <div className={s.brandInner}>
          <Link href="/" className={s.brandLogo}>
            <AppLogo size={44} />
            <span>Ahorrando Ando</span>
          </Link>
          <h2>{brandTitle}</h2>
          <p>{brandText}</p>
        </div>
      </div>

      <div className={s.formPane}>
        <div className={s.formCard}>
          <div className={s.formHead}>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  )
}
