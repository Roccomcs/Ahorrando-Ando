'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePortfolio, usePortfolioHistory, useRefreshPortfolio } from '@/hooks/usePortfolio'
import { Button } from '@/components/ds/Button'
import { EmptyState } from '@/components/ds/EmptyState'
import { Delta, formatPct } from '@/components/ds/Delta'
import { formatMoney } from '@/components/ds/Stat'
import { AssetAvatar, CATEGORY_LABEL } from '@/components/ds/AssetAvatar'
import { useCurrency } from '@/lib/currency-context'
import type { PortfolioSummaryDTO } from '@/lib/types'

const PROVIDER_LABELS: Record<string, string> = {
  binance: 'Binance', mercadopago: 'Mercado Pago', bullmarket: 'Bull Market',
  bullmarket_csv: 'Bull Market', lemoncash: 'Lemon', iol: 'IOL', onchain: 'Wallet EVM',
  solana: 'Solana', balanz_csv: 'Balanz', manual: 'Manual',
}
function label(p: string) { return PROVIDER_LABELS[p] ?? p }

type Period = { label: string; days: number }
const PERIODS: Period[] = [
  { label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: '1a', days: 365 },
]

function isoFrom(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString()
}
function pctChange(points: { total_usd: number }[], fromEnd: number) {
  if (points.length < 2) return null
  const last = points[points.length - 1].total_usd
  const idx = Math.max(0, points.length - 1 - fromEnd)
  const base = points[idx].total_usd
  if (!base) return null
  return ((last - base) / base) * 100
}

const OVERLINE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)',
}
const META: React.CSSProperties = { fontSize: 12, color: 'var(--text-3)' }

/* ── Evolution area chart ───────────────────────────────────── */
function AreaChart({ points: rawPoints, symbol }: { points: { date: string; usd: number }[]; symbol: string }) {
  const [hover, setHover] = useState<number | null>(null)
  // Con 1 solo snapshot dibujamos una línea plana (cuenta nueva): el gráfico
  // siempre se ve, y se va poblando con cada actualización.
  const points = rawPoints.length === 1
    ? [{ ...rawPoints[0], date: new Date(Date.now() - 86400000).toISOString() }, rawPoints[0]]
    : rawPoints
  if (points.length < 2) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>
        El historial se acumula con cada actualización del portfolio.
      </div>
    )
  }
  const W = 900, H = 260, PL = 8, PR = 64, PT = 12, PB = 26
  const ys = points.map(p => p.usd)
  const min = Math.min(...ys), max = Math.max(...ys), range = max - min || 1
  const x = (i: number) => PL + (i / (points.length - 1)) * (W - PL - PR)
  const y = (v: number) => PT + (1 - (v - min) / range) * (H - PT - PB)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.usd).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PB} L${x(0).toFixed(1)},${H - PB} Z`
  const yTicks = [max, min + range / 2, min]
  const xIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1]
  const fmtK = (v: number) => v >= 1000 ? `${symbol} ${(v / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })}` : `${symbol} ${v.toFixed(0)}`
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
      onMouseMove={e => {
        const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
        const mx = ((e.clientX - r.left) / r.width) * W
        let best = 0, bd = Infinity
        points.forEach((_, i) => { const d = Math.abs(x(i) - mx); if (d < bd) { bd = d; best = i } })
        setHover(best)
      }}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id="ev-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(65,164,239,0.28)" />
          <stop offset="100%" stopColor="rgba(65,164,239,0.02)" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PL} y1={y(v)} x2={W - PR} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 4" />
          <text x={W - PR + 8} y={y(v) + 4} fontSize="11" fill="var(--text-3)" fontFamily="var(--font-mono)">{fmtK(v)}</text>
        </g>
      ))}
      <path d={area} fill="url(#ev-fill)" />
      <path d={line} fill="none" stroke="#41A4EF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {xIdx.map((idx, i) => (
        <text key={i} x={x(idx)} y={H - 8} textAnchor={i === 0 ? 'start' : i === xIdx.length - 1 ? 'end' : 'middle'}
          fontSize="11" fill="var(--text-3)" fontFamily="var(--font-mono)">{i === xIdx.length - 1 ? 'Hoy' : fmtDate(points[idx].date)}</text>
      ))}
      {hover !== null && (
        <g>
          <line x1={x(hover)} y1={PT} x2={x(hover)} y2={H - PB} stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx={x(hover)} cy={y(points[hover].usd)} r="4" fill="#41A4EF" stroke="var(--bg)" strokeWidth="2" />
        </g>
      )}
    </svg>
  )
}

function RefreshIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
}
function ZapIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
}

export default function DashboardPage() {
  const { data: portfolio, isLoading, error } = usePortfolio()
  const refresh = useRefreshPortfolio()
  const [period, setPeriod] = useState<Period>(PERIODS[2])
  // Memoizado: si el "from" cambia en cada render, la queryKey de react-query
  // cambia siempre y entra en loop de refetch infinito (429 en el backend).
  const fromIso = useMemo(() => isoFrom(period.days), [period.days])
  const { data: history, isLoading: historyLoading } = usePortfolioHistory(fromIso)
  const { currency, format } = useCurrency()

  if (isLoading) return <Skeleton />
  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--negative)' }}>
        Error al cargar el portfolio.{' '}
        <Button size="sm" variant="secondary" onClick={() => refresh.mutate()}>Reintentar</Button>
      </div>
    )
  }
  if (!portfolio || portfolio.providers.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Hero portfolio={portfolio} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} deltas={{ d1: null, d7: null, d30: null }} />
        <div className="aa-card aa-card--pad-lg">
          <EmptyState icon={<ZapIcon />} title="Bienvenido a Ahorrando Ando"
            body="Conectá tu primera cuenta financiera para ver tus activos unificados acá."
            action={<Link href="/integrations"><Button>Conectar primera cuenta</Button></Link>} />
        </div>
      </div>
    )
  }

  const pts = history?.points.map(p => ({ date: p.snapshot_at, usd: p.total_usd })) ?? []
  const rate = portfolio.usd_to_ars
  const evoPct = pctChange(history?.points ?? [], (history?.points?.length ?? 1) - 1)
  const evoAbs = pts.length >= 2 ? pts[pts.length - 1].usd - pts[0].usd : 0

  // Deltas del hero: reales desde el portfolio (24h, 30d) + 7d desde history si hay.
  const d1 = portfolio.change_pct_24h
  const d30 = portfolio.change_pct_30d
  const d7 = pctChange(history?.points ?? [], 7)

  // Principales activos: aplanar holdings, ordenar por valor.
  const topAssets = portfolio.providers
    .flatMap(p => p.holdings.map(h => ({ ...h, provider: p.provider })))
    .sort((a, b) => b.current_value_usd - a.current_value_usd)
    .slice(0, 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div className="aa-sec aa-sec--1">
        <Hero portfolio={portfolio} onRefresh={() => refresh.mutate()} refreshing={refresh.isPending} deltas={{ d1, d7, d30 }} />
      </div>

      {/* EVOLUCIÓN */}
      <section className="aa-sec aa-sec--2">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={OVERLINE}>Evolución</span>
            {evoPct !== null && <Delta value={evoPct} size="md" />}
            {pts.length >= 2 && (
              <span className="aa-num" style={{ fontSize: 13, color: evoAbs >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 600 }}>
                · {evoAbs >= 0 ? '+' : '−'}{format(Math.abs(evoAbs), rate)}
              </span>
            )}
          </div>
          <div className="aa-seg">
            {PERIODS.map(p => (
              <button key={p.label} className={`aa-seg__opt${period.label === p.label ? ' aa-seg__opt--on' : ''}`} onClick={() => setPeriod(p)}>{p.label}</button>
            ))}
          </div>
        </div>
        {historyLoading
          ? <div className="aa-skel" style={{ height: 260 }} />
          : <AreaChart points={pts} symbol={currency === 'ARS' && rate ? 'AR$' : 'US$'} />}
      </section>

      {/* PRINCIPALES ACTIVOS */}
      {topAssets.length > 0 && (
        <section className="aa-sec aa-sec--3">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={OVERLINE}>Principales activos</span>
            <Link href="/history" style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>Ver historial completo →</Link>
          </div>
          <div className="aa-tablewrap" role="region" aria-label="Principales activos" tabIndex={0}>
            <div role="table">
              <div role="row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', gap: 8, padding: '0 4px 10px', borderBottom: '1px solid var(--border-1)' }}>
                {['Activo', 'Cantidad', 'Precio', 'Valor', '24h'].map((h, i) => (
                  <span role="columnheader" key={h} style={{ ...META, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, textAlign: i === 0 ? 'left' : 'right' }}>{h}</span>
                ))}
              </div>
              {topAssets.map((a, i) => {
                const price = a.amount > 0 ? a.current_value_usd / a.amount : 0
                return (
                  <div role="row" key={`${a.provider}-${a.asset_symbol}-${i}`} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 0.8fr', gap: 8, alignItems: 'center', padding: '14px 4px', borderBottom: '1px solid var(--border-1)' }}>
                    <div role="cell" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <AssetAvatar logoUrl={a.logo_url} symbol={a.asset_symbol} category={a.category} size={34} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset_name || a.asset_symbol}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.category ? CATEGORY_LABEL[a.category] : label(a.provider)}</div>
                      </div>
                    </div>
                    <span role="cell" className="aa-num" style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'right' }}>{a.amount.toLocaleString('es-AR', { maximumFractionDigits: 6 })}</span>
                    <span role="cell" className="aa-num" style={{ fontSize: 13, color: 'var(--text-2)', textAlign: 'right' }}>{price > 0 ? format(price, rate) : '—'}</span>
                    <span role="cell" className="aa-num" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}>{format(a.current_value_usd, rate)}</span>
                    <span role="cell" style={{ textAlign: 'right' }}>{typeof a.performance_24h === 'number' ? <Delta value={a.performance_24h} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function Hero({ portfolio, onRefresh, refreshing, deltas }: {
  portfolio: PortfolioSummaryDTO | undefined
  onRefresh: () => void; refreshing: boolean
  deltas: { d1: number | null; d7: number | null; d30: number | null }
}) {
  const { currency, format } = useCurrency()
  const total = portfolio?.total_usd ?? 0
  const rate = portfolio?.usd_to_ars ?? null
  // Subtítulo: monto en la moneda opuesta + cotización.
  const oppositeCurrency = currency === 'USD' ? (rate ? formatMoney(total * rate, 'AR$') : null) : formatMoney(total, 'US$')

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-1)', margin: 0 }}>
          Patrimonio total
        </h1>
        <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'clamp(32px, 8vw, 52px)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.05, color: 'var(--text-1)', margin: '10px 0 8px', overflowWrap: 'anywhere' }}>
          {format(total, rate)}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, color: 'var(--text-3)' }}>
          {oppositeCurrency}{rate ? ` · AR$ ${rate.toLocaleString('es-AR', { maximumFractionDigits: 0 })} / US$` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
          {([['24h', deltas.d1], ['7d', deltas.d7], ['30d', deltas.d30]] as const).map(([lab, val]) => (
            <div key={lab} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{lab}</span>
              {val !== null ? <Delta value={val} /> : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-3)', fontSize: 13 }}>—</span>}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Link href="/integrations"><Button variant="secondary" size="sm">+ Agregar activo</Button></Link>
        <Button variant="primary" size="sm" icon={<RefreshIcon />} onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Actualizando…' : 'Actualizar'}
        </Button>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="aa-skel" style={{ height: 14, width: 140 }} />
        <div className="aa-skel" style={{ height: 52, width: 340 }} />
        <div className="aa-skel" style={{ height: 14, width: 260 }} />
      </div>
      <div className="aa-skel" style={{ height: 260 }} />
      {[0, 1, 2].map(i => <div key={i} className="aa-skel" style={{ height: 64 }} />)}
    </div>
  )
}
