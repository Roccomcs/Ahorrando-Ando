'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import s from './page.module.css'
import { AppLogo } from '@/components/ds/AppLogo'
import { ForceDarkTheme } from '@/lib/theme-context'

function useHideOnScroll() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    function onScroll() {
      const y = window.scrollY
      // Oculta al bajar (pasado el header), muestra al subir
      if (y > lastY && y > 120) setHidden(true)
      else if (y < lastY) setHidden(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return hidden
}

const PROVIDERS: { name: string; chartVar: string; initials: string; logo?: string }[] = [
  { name: 'Binance',      chartVar: '--chart-1', initials: 'BI', logo: '/providers/binance.svg' },
  { name: 'Mercado Pago', chartVar: '--chart-2', initials: 'MP', logo: '/providers/mercado-pago.svg' },
  { name: 'Lemon',        chartVar: '--chart-5', initials: 'L'  },
  { name: 'IOL',          chartVar: '--chart-3', initials: 'I'  },
  { name: 'Bull Market',  chartVar: '--chart-4', initials: 'BM' },
  { name: 'Balanz',       chartVar: '--chart-8', initials: 'B'  },
  { name: 'Wallets EVM',  chartVar: '--chart-6', initials: 'WE' },
]

const MOCK_ROWS = [
  { initials: 'BI', name: 'Binance',       amount: 'US$ 21.940,12', pct: '+1,8%', dir: 'up', chart: '--chart-1' },
  { initials: 'I',  name: 'IOL',           amount: 'US$ 14.875,40', pct: '+3,2%', dir: 'up', chart: '--chart-3' },
  { initials: 'MP', name: 'Mercado Pago',  amount: 'US$  6.281,05', pct: '−0,4%', dir: 'dn', chart: '--chart-2' },
  { initials: 'WE', name: 'Wallets EVM',   amount: 'US$  5.134,00', pct: '+0,9%', dir: 'up', chart: '--chart-6' },
]

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  )
}

export default function LandingPage() {
  const hidden = useHideOnScroll()

  return (
    <div className={s.page}>
      <ForceDarkTheme />

      {/* NAVBAR */}
      <header className={`${s.nav} ${hidden ? s.navHidden : ''}`}>
        <div className={`${s.wrap} ${s.navInner}`}>
          <a href="#top" className={s.lockup}>
            <AppLogo size={52} />
            <span className={s.wm}>Ahorrando Ando</span>
          </a>
          <div className={s.navCta}>
            <Link href="/login" className={s.navLink}>Iniciar sesión</Link>
            <Link href="/register" className={`${s.btn} ${s.btnSm} ${s.btnPill}`}>Registrarse</Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <a id="top" />
      <section className={`${s.hero}`}>
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <h1 className={s.title}>Toda tu plata,<br />en <em>una única</em> aplicación.</h1>
            <p className={s.tagline}>Exchanges, brokers y billeteras virtuales, juntas en pesos y dólares.</p>
            <p className={s.lede}>
              Conectá tus aplicaciones de inversiones financieras favoritas.
              Ahorrando Ando centraliza tu patrimonio con gráficos, historial y alertas.
            </p>
            <div className={s.ctaRow}>
              <Link href="/register" className={`${s.btn} ${s.btnPill}`}>Crear cuenta gratis</Link>
              <Link href="/login" className={`${s.btn} ${s.btnSecondary}`}>Iniciar sesión</Link>
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

      {/* QUÉ HACEMOS */}
      <section id="features" className={`${s.section} ${s.secGray}`}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <div className={s.secOverline}>Como trabajamos</div>
            <h2 className={s.secTitle}>Tu portafolio en un único lugar</h2>
            <p className={s.secSub}>Todas tus aplicaciones de inversión favoritas en un único lugar, con gráficos para entender de manera práctica y sencilla cómo te está yendo.</p>
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

      {/* CONEXIONES */}
      <section id="providers" className={`${s.section} ${s.secBlack}`}>
        <div className={s.wrap}>
          <div className={s.secHead}>
            <div className={s.secOverline}>Conexiones</div>
            <h2 className={s.secTitle}>Conectá lo que ya usás</h2>
            <p className={s.secSub}>Exchanges, brokers, billeteras y wallets on-chain. Sumás una cuenta en segundos con tu clave API de solo lectura.</p>
          </div>
          <div className={s.provGrid}>
            {PROVIDERS.map(p => (
              <div key={p.name} className={s.provTile}>
                {p.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logo} alt={p.name} className={s.provLogo} />
                ) : (
                  <span className={s.pmark} style={{ width: 48, height: 48, borderRadius: 14, background: `color-mix(in srgb,var(${p.chartVar}) 16%,transparent)`, color: `var(${p.chartVar})`, border: `1px solid color-mix(in srgb,var(${p.chartVar}) 35%,transparent)`, fontSize: 18 }}>
                    {p.initials}
                  </span>
                )}
                <span className={s.nm}>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PERFORMANCE */}
      <section id="performance" className={`${s.section} ${s.secGray}`}>
        <div className={`${s.wrap} ${s.featureRow}`}>
          <div className={s.featureCopy}>
            <div className={s.secOverline}>Performance</div>
            <h2 className={s.secTitle}>Cuánto rinde cada cuenta</h2>
            <p className={s.secSub}>Compará el rendimiento de cada exchange y broker lado a lado. Descubrí qué te hace ganar y qué te frena, valuado siempre en dólares.</p>
            <ul className={s.featureList}>
              <li><Check /> Rendimiento por proveedor y por activo</li>
              <li><Check /> Variación 24h, 7d, 30d y total</li>
              <li><Check /> Ranking de ganadores y perdedores</li>
            </ul>
          </div>
          <div className={s.featureVisual}>
            <div className={s.mockup} aria-hidden="true">
              <div className={s.mkTop}>
                <div className={s.dots}><i /><i /><i /></div>
                <div className={s.seg}><b>24h</b><b>7d</b><b className={s.on}>30d</b><b>Total</b></div>
              </div>
              <div className={s.mkBody}>
                <div className={s.mkOverline}>Rendimiento 30 días</div>
                <div className={s.mkTotal}>+8,7%</div>
                <div className={s.mkDelta}>+US$ 3.860,40</div>
                <div className={s.mkRows}>
                  {MOCK_ROWS.map(r => (
                    <div key={r.name} className={s.mkRow}>
                      <span className={s.pmark} style={{ width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb,var(${r.chart}) 16%,transparent)`, color: `var(${r.chart})`, border: `1px solid color-mix(in srgb,var(${r.chart}) 35%,transparent)`, fontSize: 11 }}>{r.initials}</span>
                      <span className={s.nm}>{r.name}</span>
                      <span className={`${s.pc} ${r.dir === 'up' ? s.up : s.dn}`}>{r.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORIAL */}
      <section id="history" className={`${s.section} ${s.secBlack}`}>
        <div className={`${s.wrap} ${s.featureRow} ${s.featureRowReverse}`}>
          <div className={s.featureCopy}>
            <div className={s.secOverline}>Historial</div>
            <h2 className={s.secTitle}>Cómo evolucionó tu plata</h2>
            <p className={s.secSub}>Gráficos en tiempo real de tu patrimonio, para que veas cómo crece tu dinero de manera simple.</p>
          </div>
          <div className={s.featureVisual}>
            <div className={s.mockup} aria-hidden="true">
              <div className={s.mkTop}>
                <div className={s.dots}><i /><i /><i /></div>
                <div className={s.seg}><b>1M</b><b>3M</b><b className={s.on}>1A</b><b>Todo</b></div>
              </div>
              <div className={s.mkBody}>
                <div className={s.mkOverline}>Patrimonio · último año</div>
                <div className={s.mkTotal}>US$ 48.230</div>
                <div className={s.mkDelta}>+34,2% · +US$ 12.290</div>
                <svg className={s.spark} viewBox="0 0 320 64" preserveAspectRatio="none" fill="none">
                  <path d="M0,56 L40,52 L80,54 L120,44 L160,46 L200,32 L240,30 L280,18 L320,10" stroke="#3DD993" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0,56 L40,52 L80,54 L120,44 L160,46 L200,32 L240,30 L280,18 L320,10 L320,64 L0,64 Z" fill="rgba(61,217,147,0.10)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics" className={`${s.section} ${s.secGray}`}>
        <div className={`${s.wrap} ${s.featureRow}`}>
          <div className={s.featureCopy}>
            <div className={s.secOverline}>Analytics</div>
            <h2 className={s.secTitle}>Entendé en qué estás parado</h2>
            <p className={s.secSub}>Mirá cómo se reparte tu plata entre tus activos y cuánto pesa cada uno, sin tecnicismos.</p>
            <ul className={s.featureList}>
              <li><Check /> Cómo se reparte tu plata entre tus activos</li>
              <li><Check /> Cuánto ganaste o perdiste con cada uno</li>
              <li><Check /> Cómo te fue comparado con el Bitcoin</li>
            </ul>
          </div>
          <div className={s.featureVisual}>
            <div className={s.mockup} aria-hidden="true">
              <div className={s.mkTop}>
                <div className={s.dots}><i /><i /><i /></div>
                <div className={s.seg}><b className={s.on}>Activos</b><b>ROI</b><b>Benchmark</b></div>
              </div>
              <div className={s.mkBody}>
                <div className={s.mkOverline}>Distribución por activo</div>
                <div className={s.mkRows}>
                  {[
                    { name: 'BTC',  pct: '38%', chart: '--chart-1' },
                    { name: 'ETH',  pct: '24%', chart: '--chart-3' },
                    { name: 'USDT', pct: '18%', chart: '--chart-2' },
                    { name: 'CEDEARs', pct: '12%', chart: '--chart-6' },
                    { name: 'Otros', pct: '8%', chart: '--chart-9' },
                  ].map(a => (
                    <div key={a.name} className={s.mkRow}>
                      <span className={s.pmark} style={{ width: 30, height: 30, borderRadius: 9, background: `color-mix(in srgb,var(${a.chart}) 16%,transparent)`, color: `var(${a.chart})`, border: `1px solid color-mix(in srgb,var(${a.chart}) 35%,transparent)`, fontSize: 10 }}>{a.name.slice(0, 2)}</span>
                      <span className={s.nm}>{a.name}</span>
                      <span className={s.vl}>{a.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                <AppLogo size={32} />
                <span className={s.wm} style={{ fontSize: 18 }}>Ahorrando Ando</span>
              </a>
              <p className={s.footNote}>Agregador de portfolios para el mercado argentino. Solo lectura: leemos tus saldos, nunca movemos tu plata.</p>
            </div>
            <div className={s.footCols}>
              <div className={s.footCol}>
                <h4>Producto</h4>
                <a href="#features">Qué hacemos</a>
                <a href="#providers">Conexiones</a>
                <a href="#performance">Performance</a>
                <a href="#analytics">Analytics</a>
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
    </div>
  )
}
