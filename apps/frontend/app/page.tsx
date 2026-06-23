'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import s from './page.module.css'

function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('aa-theme')
    const active = (saved === 'light' || saved === 'dark') ? saved : 'light'
    setTheme(active)
    document.documentElement.setAttribute('data-theme', active)
  }, [])

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('aa-theme', next)
  }

  return (
    <button className={s.themeBtn} type="button" aria-label="Cambiar tema" onClick={toggle}>
      {theme === 'light' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      )}
    </button>
  )
}

const PROVIDERS = [
  { initials: 'BI', name: 'Binance',       chartVar: '--chart-1' },
  { initials: 'L',  name: 'Lemon',         chartVar: '--chart-5' },
  { initials: 'I',  name: 'IOL',           chartVar: '--chart-3' },
  { initials: 'BM', name: 'Bull Market',   chartVar: '--chart-4' },
  { initials: 'B',  name: 'Balanz',        chartVar: '--chart-8' },
  { initials: 'MP', name: 'Mercado Pago',  chartVar: '--chart-2' },
  { initials: 'WE', name: 'Wallets EVM',   chartVar: '--chart-6' },
]

const MOCK_ROWS = [
  { initials: 'BI', name: 'Binance',       amount: 'US$ 21.940,12', pct: '+1,8%', dir: 'up', chart: '--chart-1' },
  { initials: 'I',  name: 'IOL',           amount: 'US$ 14.875,40', pct: '+3,2%', dir: 'up', chart: '--chart-3' },
  { initials: 'MP', name: 'Mercado Pago',  amount: 'US$  6.281,05', pct: '−0,4%', dir: 'dn', chart: '--chart-2' },
  { initials: 'WE', name: 'Wallets EVM',   amount: 'US$  5.134,00', pct: '+0,9%', dir: 'up', chart: '--chart-6' },
]

export default function LandingPage() {
  return (
    <>
      {/* NAVBAR */}
      <header className={s.nav}>
        <div className={`${s.wrap} ${s.navInner}`}>
          <a href="#top" className={s.lockup}>
            <Image src="/logo-mark.svg" alt="Ahorrando Ando" width={32} height={32} />
            <span className={s.wm}>Ahorrando Ando</span>
          </a>
          <div className={s.navLinks}>
            <nav>
              <a href="#features">Qué hace</a>
              <a href="#providers">Conexiones</a>
              <a href="#descarga">Descargar</a>
            </nav>
            <ThemeToggle />
            <Link href="/login" className={`${s.btn} ${s.btnPrimary} ${s.btnSm}`}>Entrá</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <a id="top" />
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <div className={s.eyebrow}>
              <i className={s.dot} />
              <span className={s.eyebrowText}>Agregador de portfolios · Argentina</span>
            </div>
            <h1 className={s.title}>Toda tu plata,<br />en <em>una sola</em> pantalla.</h1>
            <p className={s.tagline}>Exchanges, brokers y billeteras, juntos y en dólares.</p>
            <p className={s.lede}>
              Conectá Binance, IOL, Lemon, Mercado Pago y tus wallets on-chain.
              Ahorrando Ando centraliza tu patrimonio en USD, con gráficos, historial y alertas.
              Vos mirás; nosotros nunca tocamos.
            </p>
            <div className={s.ctaRow}>
              <a href="#descarga" className={`${s.btn} ${s.btnPrimary}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Descargá el APK
              </a>
              <Link href="/login" className={`${s.btn} ${s.btnSecondary}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                Abrí la app
              </Link>
            </div>
            <div className={s.trust}>
              <span className={s.ti}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                Solo lectura
              </span>
              <span className={s.ti}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="16" r="1"/><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>
                Claves API, nunca tu contraseña
              </span>
              <span className={s.ti}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                Pensado para Argentina
              </span>
            </div>
          </div>

          {/* Mockup */}
          <div className={s.mockup} aria-hidden="true">
            <div className={s.mkTop}>
              <div className={s.dots}><i /><i /><i /></div>
              <div className={s.seg}>
                <b className={s.on}>24h</b><b>7d</b><b>30d</b><b>Total</b>
              </div>
            </div>
            <div className={s.mkBody}>
              <div className={s.mkOverline}>Patrimonio total</div>
              <div className={s.mkTotal}>US$ 48.230,57</div>
              <div className={s.mkDelta}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                +2,41% · +US$ 1.134,80
              </div>
              <svg className={s.spark} viewBox="0 0 320 64" preserveAspectRatio="none" fill="none">
                <path d="M0,48 L32,44 L64,50 L96,38 L128,42 L160,30 L192,34 L224,20 L256,26 L288,12 L320,16" stroke="#41A4EF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M0,48 L32,44 L64,50 L96,38 L128,42 L160,30 L192,34 L224,20 L256,26 L288,12 L320,16 L320,64 L0,64 Z" fill="rgba(65,164,239,0.10)"/>
              </svg>
              <div className={s.mkRows}>
                {MOCK_ROWS.map(r => (
                  <div key={r.name} className={s.mkRow}>
                    <span className={s.pmark} style={{ width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb,var(${r.chart}) 16%,transparent)`, color: `var(${r.chart})`, border: `1px solid color-mix(in srgb,var(${r.chart}) 35%,transparent)`, fontSize: 11 }}>
                      {r.initials}
                    </span>
                    <span className={s.nm}>{r.name}</span>
                    <span className={s.vl}>{r.amount}</span>
                    <span className={`${s.pc} ${r.dir === 'up' ? s.up : s.dn}`}>{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className={s.divider} />

      {/* FEATURES */}
      <section id="features" className={s.section}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <div className={s.secOverline}>Qué hace</div>
            <h2 className={s.secTitle}>Una terminal para todo tu patrimonio</h2>
            <p className={s.secSub}>Lo que tenés repartido en seis apps, leído en un solo lugar y en dólares. Sin planillas, sin captura de pantalla.</p>
          </div>
          <div className={s.featGrid}>
            {[
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>, title: 'Portfolio unificado', desc: 'Todas tus cuentas sumadas en un patrimonio único, valuado en USD al instante.' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>, title: 'Alertas de precio', desc: 'Poné un umbral y enterate cuando un activo lo cruza. Ni antes ni después.' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V11"/><path d="m15 8-3-3-3 3"/><path d="M8 22H5a2 2 0 0 1-2-2V6l3-2 3 2V4"/><path d="M18 11v11"/><path d="m21 14-3-3-3 3"/></svg>, title: 'Múltiples exchanges', desc: 'Binance, Lemon, IOL, Bull Market, Balanz, Mercado Pago y wallets on-chain.' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>, title: 'Historial completo', desc: 'Cada movimiento, fechado y trazable. Mirá cómo evolucionó tu plata en el tiempo.' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>, title: 'Analytics', desc: 'Distribución por activo, rendimiento y exposición. Los números que importan, claros.' },
              { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>, title: 'Solo lectura', desc: 'Nunca ejecutamos órdenes. Conectamos con permisos de lectura: vemos, no movemos.', gold: true },
            ].map(f => (
              <div key={f.title} className={`${s.feat} ${f.gold ? s.featGold : ''}`}>
                <div className={s.featIco}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVIDERS */}
      <div className={s.provBand}>
        <section id="providers" className={s.section}>
          <div className={s.wrap}>
            <div className={s.secHead}>
              <div className={s.secOverline}>Conexiones</div>
              <h2 className={s.secTitle}>Conectá lo que ya usás</h2>
              <p className={s.secSub}>Exchanges, brokers, billeteras y wallets on-chain. Sumás una cuenta en segundos con tu clave API de solo lectura.</p>
            </div>
            <div className={s.provGrid}>
              {PROVIDERS.map(p => (
                <div key={p.name} className={s.provTile}>
                  <span className={s.pmark} style={{ width: 48, height: 48, borderRadius: 14, background: `color-mix(in srgb,var(${p.chartVar}) 16%,transparent)`, color: `var(${p.chartVar})`, border: `1px solid color-mix(in srgb,var(${p.chartVar}) 35%,transparent)`, fontSize: 18 }}>
                    {p.initials}
                  </span>
                  <span className={s.nm}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* DESCARGA */}
      <section id="descarga" className={s.section}>
        <div className={`${s.wrap} ${s.dlGrid}`}>
          <div>
            <div className={s.secOverline}>Descargá</div>
            <h2 className={s.secTitle}>Empezá en dos minutos</h2>
            <p className={s.secSub}>Bajá el APK en Android, abrí la app web desde cualquier navegador, o instalala como PWA en tu iPhone.</p>
            <div className={s.dlActions}>
              <a href="/ahorrando-ando.apk" className={`${s.dlBtn} ${s.dlBtnPrimary}`} download="ahorrando-ando.apk">
                <span className={s.dlGlyph}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </span>
                <span className={s.dlBtnText}>
                  <span>Android · APK directo</span>
                  <b>Descargá el APK</b>
                </span>
              </a>
              <Link href="/login" className={s.dlBtn}>
                <span className={s.dlGlyph}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </span>
                <span className={s.dlBtnText}>
                  <span>Cualquier navegador</span>
                  <b>Abrí la app web</b>
                </span>
              </Link>
            </div>
            <div className={s.iosNote}>
              <div className={s.iosNoteHead}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                ¿iPhone?
              </div>
              <p>Abrí la app web en Safari, tocá <span className={s.kbd}>Compartir</span> y después <span className={s.kbd}>Agregar a inicio</span>. Queda instalada como PWA, igual que una app nativa.</p>
            </div>
          </div>
          <div className={s.dlCard}>
            <div className={s.dlStat}>
              <div className={s.dlStatVal}>US$ <span className={s.dlStatUnit}>en todo</span></div>
              <div className={s.dlStatLabel}>Tu patrimonio siempre valuado en dólares</div>
            </div>
            <div className={s.dlStat}>
              <div className={s.dlStatVal}>7 <span className={s.dlStatUnit}>conexiones</span></div>
              <div className={s.dlStatLabel}>Exchanges, brokers, billeteras y wallets</div>
            </div>
            <div className={s.dlStat}>
              <div className={s.dlStatVal}>0 <span className={s.dlStatUnit}>órdenes</span></div>
              <div className={s.dlStatLabel}>Solo lectura. Nunca ejecutamos operaciones</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.wrap}>
          <div className={s.footInner}>
            <div>
              <a href="#top" className={s.lockup}>
                <Image src="/logo-mark.svg" alt="" width={28} height={28} />
                <span className={s.wm} style={{ fontSize: 16 }}>Ahorrando Ando</span>
              </a>
              <p className={s.footNote}>Agregador de portfolios para el mercado argentino. Solo lectura: leemos tus saldos, nunca movemos tu plata.</p>
            </div>
            <div className={s.footCols}>
              <div className={s.footCol}>
                <h4>Producto</h4>
                <a href="#features">Qué hace</a>
                <a href="#providers">Conexiones</a>
                <a href="#descarga">Descargar</a>
              </div>
              <div className={s.footCol}>
                <h4>App</h4>
                <Link href="/login">Iniciar sesión</Link>
                <Link href="/register">Registrarse</Link>
              </div>
              <div className={s.footCol}>
                <h4>Legal</h4>
                <Link href="/privacy">Política de privacidad</Link>
                <Link href="/terms">Términos de uso</Link>
              </div>
            </div>
          </div>
          <div className={s.footBase}>
            <span>© 2026 Ahorrando Ando. Hecho en Argentina.</span>
            <span>No somos un broker ni custodiamos fondos. Esto no es asesoramiento financiero.</span>
          </div>
        </div>
      </footer>
    </>
  )
}
