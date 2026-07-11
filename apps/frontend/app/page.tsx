'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import s from './page.module.css'
import { AppLogo } from '@/components/ds/AppLogo'
import { ForceDarkTheme } from '@/lib/theme-context'

const HeroScene = dynamic(() => import('@/components/landing/HeroScene').then(m => m.HeroScene), {
  ssr: false,
  loading: () => <div className={s.heroSceneFallback} aria-hidden="true" />,
})

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
  { name: 'Lemon',        chartVar: '--chart-5', initials: 'L',  logo: '/providers/lemon.svg' },
  { name: 'IOL',          chartVar: '--chart-3', initials: 'I',  logo: '/providers/iol.svg' },
  { name: 'Bull Market',  chartVar: '--chart-4', initials: 'BM', logo: '/providers/bullmarket.png' },
  { name: 'Balanz',       chartVar: '--chart-8', initials: 'B',  logo: '/providers/balanz.svg' },
  { name: 'Wallets EVM',  chartVar: '--chart-6', initials: 'WE', logo: '/providers/ethereum.svg' },
]

const MOCK_ROWS = [
  { name: 'Binance',      logo: '/providers/binance.svg',      amount: 'US$ 21.940,12', pct: '+1,8%', dir: 'up' },
  { name: 'IOL',          logo: '/providers/iol.svg',          amount: 'US$ 14.875,40', pct: '+3,2%', dir: 'up' },
  { name: 'Mercado Pago', logo: '/providers/mercado-pago.svg', amount: 'US$  6.281,05', pct: '−0,4%', dir: 'dn' },
  { name: 'Wallets EVM',  logo: '/providers/ethereum.svg',     amount: 'US$  5.134,00', pct: '+0,9%', dir: 'up' },
]

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  )
}

// ── "Cómo trabajamos": acordeón horizontal. Al pasar el mouse (o enfocar con
// teclado) se expande el panel y aparece un mini-preview de esa parte de la app,
// en la misma paleta gris del fondo. En mobile se apila y muestra todo abierto.
type HowItem = { key: string; title: string; desc: string; gold?: boolean; icon: React.ReactNode; visual: React.ReactNode }

const CIELO = 'var(--cielo-400)'
const G1 = 'rgba(255,255,255,0.22)', G2 = 'rgba(255,255,255,0.14)', G3 = 'rgba(255,255,255,0.09)'

const HOW_ITEMS: HowItem[] = [
  {
    key: 'portfolio', title: 'Portfolio unificado',
    desc: 'Todas tus cuentas sumadas en un patrimonio único, en pesos y dólares al instante.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7.5" height="7.5" x="3" y="3" rx="1"/><rect width="7.5" height="7.5" x="13.5" y="3" rx="1"/><rect width="7.5" height="7.5" x="3" y="13.5" rx="1"/><rect width="7.5" height="7.5" x="13.5" y="13.5" rx="1"/></svg>,
    visual: (
      <div className={s.accCard}>
        <span className={s.accCardLabel}>Patrimonio total</span>
        <span className={s.accCardNum}>US$ 48.320</span>
        <div className={s.accBar}>
          <span style={{ flex: 5, background: CIELO }} />
          <span style={{ flex: 3, background: G1 }} />
          <span style={{ flex: 2, background: G2 }} />
          <span style={{ flex: 1.4, background: G3 }} />
        </div>
      </div>
    ),
  },
  {
    key: 'alertas', title: 'Alertas de precio',
    desc: 'Poné un umbral y enterate cuando un activo lo cruza. Ni antes ni después.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
    visual: (
      <div className={s.accCard}>
        <div className={s.accRow}><span>BTC cruza</span><span className={s.accRowMono}>US$ 110.000</span></div>
        <svg viewBox="0 0 300 46" width="100%" height="46" preserveAspectRatio="none" aria-hidden>
          <line x1="0" y1="30" x2="300" y2="30" stroke={G2} strokeWidth="1" strokeDasharray="4 4" />
          <polyline points="0,38 60,34 110,36 160,22 210,26 260,10 300,14" fill="none" stroke={G1} strokeWidth="1.5" />
          <circle cx="235" cy="18" r="4" fill={CIELO} />
        </svg>
        <div className={s.accRow}><span>Estado</span><span style={{ color: CIELO, fontFamily: 'var(--font-mono)' }}>● activa</span></div>
      </div>
    ),
  },
  {
    key: 'exchanges', title: 'Múltiples exchanges',
    desc: 'Binance, Lemon, IOL, Bull Market, Balanz, Mercado Pago y wallets on-chain.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14"/><path d="M15 4l4 4-4 4"/><path d="M20 16H6"/><path d="M9 12l-4 4 4 4"/></svg>,
    visual: (
      <div className={s.accCard}>
        <span className={s.accCardLabel}>Cuentas conectadas</span>
        <div className={s.accChips}>
          {['Binance', 'Lemon', 'IOL', 'Bull Market', 'Balanz', 'Mercado Pago'].map(n => (
            <span key={n} className={s.accChip}>{n}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'historial', title: 'Historial completo',
    desc: 'Cada movimiento, fechado y trazable. Mirá cómo evolucionó tu plata en el tiempo.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>,
    visual: (
      <div className={s.accCard}>
        {[['12 jun', 'Compra BTC', '+0,012'], ['10 jun', 'Depósito ARS', '+150.000'], ['7 jun', 'Venta ETH', '−0,4']].map(([d, t, v]) => (
          <div key={d} className={s.accRow}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ll-text-3)' }}>{d}</span>
            <span style={{ flex: 1, color: 'var(--ll-text-2)' }}>{t}</span>
            <span className={s.accRowMono}>{v}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'analytics', title: 'Analytics',
    desc: 'Distribución por activo, rendimiento y exposición. Los números que importan, claros.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="5"/><line x1="19" y1="20" x2="19" y2="9"/></svg>,
    visual: (
      <div className={s.accCard}>
        <span className={s.accCardLabel}>Rendimiento · 30d</span>
        <div className={s.accMiniBars}>
          <span style={{ height: '45%' }} />
          <span style={{ height: '70%' }} />
          <span style={{ height: '35%' }} />
          <span style={{ height: '90%', background: CIELO }} />
          <span style={{ height: '60%' }} />
        </div>
      </div>
    ),
  },
  {
    key: 'lectura', title: 'Solo lectura', gold: true,
    desc: 'Nunca ejecutamos órdenes. Conectamos con permisos de lectura: vemos, no movemos.',
    icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>,
    visual: (
      <div className={s.accCard}>
        <div className={s.accRow}>
          <span>Permiso de la API</span>
          <span className={s.accChip} style={{ color: 'var(--sol-400)', borderColor: 'rgba(232,194,104,0.35)' }}>lectura</span>
        </div>
        <div className={s.accRow}><span>Retirar fondos</span><span style={{ color: 'var(--ll-text-3)', fontFamily: 'var(--font-mono)' }}>✕ nunca</span></div>
      </div>
    ),
  },
]

function HowItWorks() {
  const [active, setActive] = useState(0)
  return (
    <div className={s.acc}>
      {HOW_ITEMS.map((it, i) => {
        const on = i === active
        const num = String(i + 1).padStart(2, '0')
        return (
          <div
            key={it.key}
            className={`${s.accPanel}${on ? ' ' + s.accPanelActive : ''}${it.gold ? ' ' + s.accGold : ''}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            tabIndex={0}
            role="button"
            aria-expanded={on}
            aria-label={it.title}
          >
            <div className={s.accCollapsed} aria-hidden>
              <span className={s.accNum}>{num}</span>
              <span className={s.accVTitle}>{it.title}</span>
            </div>
            <div className={s.accExpanded}>
              <div className={s.accTop}>
                <span className={s.accIco}>{it.icon}</span>
                <span className={s.accCount}>{num} / 06</span>
              </div>
              <div className={s.accVisual}>{it.visual}</div>
              <div className={s.accBody}>
                <h3>{it.title}</h3>
                <p>{it.desc}</p>
              </div>
            </div>
            <div className={s.accLine} />
          </div>
        )
      })}
    </div>
  )
}

function countUp(el: HTMLElement) {
  const target = parseFloat(el.dataset.count ?? '')
  if (Number.isNaN(target)) return
  const decimals = parseInt(el.dataset.decimals ?? '0', 10)
  const prefix = el.dataset.prefix ?? ''
  const suffix = el.dataset.suffix ?? ''
  const fmt = new Intl.NumberFormat('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  const duration = 1100
  const t0 = performance.now()
  function frame(now: number) {
    const t = Math.min(1, (now - t0) / duration)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    el.textContent = prefix + fmt.format(target * eased) + suffix
    if (t < 1) requestAnimationFrame(frame)
    else el.textContent = prefix + fmt.format(target) + suffix
  }
  requestAnimationFrame(frame)
}

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(`.${s.reveal}`))
    if (!els.length) return
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add(s.revealed)
            e.target.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -12% 0px' },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export default function LandingPage() {
  const hidden = useHideOnScroll()
  useScrollReveal()

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
      <main id="main">
      <section className={`${s.hero}`}>
        <div className={`${s.wrap} ${s.heroGrid} ${s.reveal}`}>
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

          <HeroScene />
        </div>
      </section>

      {/* QUÉ HACEMOS */}
      <section id="features" className={`${s.section}`}>
        <div className={`${s.wrap} ${s.reveal}`}>
          <div className={s.secHead}>
            <div className={s.secOverline}>Como trabajamos</div>
            <h2 className={s.secTitle}>Tu portafolio en un único lugar</h2>
            <p className={s.secSub}>Todas tus aplicaciones de inversión favoritas en un único lugar, con gráficos para entender de manera práctica y sencilla cómo te está yendo.</p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* CONEXIONES */}
      <section id="providers" className={`${s.section}`}>
        <div className={`${s.wrap} ${s.reveal}`}>
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
      <section id="performance" className={`${s.section}`}>
        <div className={`${s.wrap} ${s.featureRow} ${s.reveal}`}>
          <div className={s.featureCopy}>
            <div className={s.secOverline}>Performance</div>
            <h2 className={s.secTitle}>Cuánto rinde cada cuenta</h2>
            <p className={s.secSub}>Compará el rendimiento de cada exchange y broker lado a lado. Descubrí qué te hace ganar y qué te frena.</p>
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
                <div className={s.mkTotal} data-count="8.7" data-prefix="+" data-suffix="%" data-decimals="1">+8,7%</div>
                <div className={s.mkDelta}>+US$ 3.860,40</div>
                <div className={s.mkRows}>
                  {MOCK_ROWS.map(r => (
                    <div key={r.name} className={s.mkRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.logo} alt={r.name} className={s.assetLogo} />
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
      <section id="history" className={`${s.section}`}>
        <div className={`${s.wrap} ${s.featureRow} ${s.featureRowReverse} ${s.reveal}`}>
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
                <div className={s.mkTotal} data-count="48230" data-prefix="US$ " data-decimals="0">US$ 48.230</div>
                <div className={s.mkDelta}>+34,2% · +US$ 12.290</div>
                <svg className={s.spark} viewBox="0 0 320 64" preserveAspectRatio="none" fill="none">
                  <path className={s.sparkLine} pathLength={1} d="M0,56 L40,52 L80,54 L120,44 L160,46 L200,32 L240,30 L280,18 L320,10" stroke="#3DD993" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M0,56 L40,52 L80,54 L120,44 L160,46 L200,32 L240,30 L280,18 L320,10 L320,64 L0,64 Z" fill="rgba(61,217,147,0.10)"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics" className={`${s.section}`}>
        <div className={`${s.wrap} ${s.featureRow} ${s.reveal}`}>
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
                  {([
                    { name: 'BTC',  pct: '38%', logo: '/crypto/btc.svg' },
                    { name: 'ETH',  pct: '24%', logo: '/crypto/eth.svg' },
                    { name: 'USDT', pct: '18%', logo: '/crypto/usdt.svg' },
                    { name: 'CEDEARs', pct: '12%' },
                    { name: 'Otros', pct: '8%' },
                  ] as { name: string; pct: string; logo?: string }[]).map(a => (
                    <div key={a.name} className={s.mkRow}>
                      {a.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.logo} alt={a.name} className={s.assetLogo} />
                      )}
                      <span className={s.nm}>{a.name}</span>
                      <span className={s.vl} data-count={parseInt(a.pct, 10)} data-suffix="%" data-decimals="0">{a.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.reveal}`}>
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
