'use client'

import { useMemo, useState } from 'react'
import { useAllocation, useBenchmark, usePortfolio, useAssetHistory } from '@/hooks/usePortfolio'
import { AssetAvatar } from '@/components/ds/AssetAvatar'
import { useCurrency } from '@/lib/currency-context'
import type { AllocationItem, AssetCategory, AssetHistoryPoint } from '@/lib/types'

// Activo elegible para el gráfico (derivado de los holdings del portfolio).
interface AssetOption {
  symbol: string; name: string; category?: AssetCategory | null
  logo_url?: string | null; price_usd: number; value_usd: number
}

/* ── Gráfico de precio histórico (área, estilo TradingView) ──── */
function PriceChart({ points, up }: { points: AssetHistoryPoint[]; up: boolean }) {
  const W = 720, H = 240, PAD = 8
  if (points.length < 2) return null
  const prices = points.map(p => p.price_usd)
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1
  const stroke = up ? 'var(--positive)' : 'var(--negative)'
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - min) / range) * (H - PAD * 2)
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.price_usd).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`
  const gid = up ? 'aa-pc-up' : 'aa-pc-dn'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }
const OVERLINE_MUTED: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)',
}

// Colores por tipo de activo (cripto dorado, CEDEARs azul, pesos verde agua,
// bonos arena — como la referencia).
const TYPE_COLORS: Record<string, string> = {
  crypto: '#E8C268', cripto: '#E8C268',
  cedear: '#63B8F4', cedears: '#63B8F4', stock: '#41A4EF', accion: '#41A4EF', acciones: '#41A4EF',
  fx: '#45D4C8', pesos: '#45D4C8', cash: '#45D4C8', efectivo: '#45D4C8',
  bond: '#D6C08A', bono: '#D6C08A', bonos: '#D6C08A',
}
const FALLBACK_COLORS = ['#E8C268', '#63B8F4', '#45D4C8', '#D6C08A', '#9D8CFF', '#F08FB7']
function typeColor(label: string, idx: number) {
  return TYPE_COLORS[label.toLowerCase()] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

function BenchRow({ label, pct, color, maxAbs, bold }: { label: string; pct: number | null; color: string; maxAbs: number; bold?: boolean }) {
  const width = pct === null ? 0 : Math.max(3, (Math.abs(pct) / (maxAbs || 1)) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '13px 0', borderBottom: '1px solid var(--border-1)' }}>
      <span style={{ width: 130, flexShrink: 0, fontSize: 14, fontWeight: bold ? 700 : 500, color: bold ? 'var(--text-1)' : 'var(--text-2)' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--surface-hover)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 999, transition: 'width var(--dur-base) var(--ease-out)' }} />
      </div>
      <span style={{ ...MONO, width: 70, textAlign: 'right', fontSize: 13, fontWeight: 600, color: pct === null ? 'var(--text-3)' : pct >= 0 ? 'var(--positive)' : 'var(--negative)', flexShrink: 0 }}>
        {pct === null ? '—' : `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1).replace('.', ',')}%`}
      </span>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data: allocation, isLoading } = useAllocation()
  const { data: portfolio } = usePortfolio()
  const { data: btcBench } = useBenchmark('BTC', '30d')
  const { data: ethBench } = useBenchmark('ETH', '30d')
  const { format } = useCurrency()
  const rate = portfolio?.usd_to_ars

  // Activos elegibles para el gráfico: los que el usuario tiene, únicos por símbolo.
  const assetOptions = useMemo<AssetOption[]>(() => {
    const map = new Map<string, AssetOption>()
    for (const p of portfolio?.providers ?? []) {
      for (const h of p.holdings) {
        if (h.amount <= 0 || h.category === 'fx') continue  // el efectivo no tiene gráfico
        const price = h.amount > 0 ? h.current_value_usd / h.amount : 0
        const prev = map.get(h.asset_symbol)
        if (prev) { prev.value_usd += h.current_value_usd; continue }
        map.set(h.asset_symbol, {
          symbol: h.asset_symbol, name: h.asset_name, category: h.category,
          logo_url: h.logo_url, price_usd: price, value_usd: h.current_value_usd,
        })
      }
    }
    return [...map.values()].sort((a, b) => b.value_usd - a.value_usd)
  }, [portfolio])

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [chartDays, setChartDays] = useState(30)
  const selected = assetOptions.find(a => a.symbol === selectedSymbol) ?? assetOptions[0] ?? null
  const { data: history, isLoading: historyLoading } = useAssetHistory(selected?.category, selected?.symbol, chartDays)

  const chart = useMemo(() => {
    const pts = history?.available ? history.points : []
    if (pts.length < 2) return null
    const first = pts[0].price_usd, last = pts[pts.length - 1].price_usd
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0
    return { pts, up: last >= first, changePct }
  }, [history])

  const types = useMemo(() => {
    const items = allocation?.by_type ?? []
    return items.map((t, i) => ({ ...t, color: typeColor(t.label, i) }))
  }, [allocation])

  // Símbolos que componen cada tipo (para el subtítulo de cada fila).
  const symbolsByType = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const a of (allocation?.by_asset ?? []) as AllocationItem[]) {
      const key = (a.category || '').toLowerCase()
      const arr = map.get(key) ?? []
      if (arr.length < 4) arr.push(a.label)
      map.set(key, arr)
    }
    return map
  }, [allocation])

  // Concentración: métricas reales derivadas de la distribución.
  const concentration = useMemo(() => {
    const assets = (allocation?.by_asset ?? []) as AllocationItem[]
    if (assets.length === 0) return null
    const top = [...assets].sort((a, b) => b.percentage - a.percentage)[0]
    const pesosPct = types.filter(t => ['fx', 'pesos', 'cash', 'efectivo'].includes(t.label.toLowerCase()))
      .reduce((s, t) => s + t.percentage, 0)
    const dollarPct = Math.max(0, 100 - pesosPct)
    return { top, pesosPct, dollarPct }
  }, [allocation, types])

  const benchRows = [
    { label: 'Tu portfolio', pct: btcBench?.portfolio_change_pct ?? null, color: 'var(--primary)', bold: true },
    { label: 'Bitcoin', pct: btcBench?.asset_change_pct ?? null, color: 'var(--text-3)' },
    { label: 'Ethereum', pct: ethBench?.asset_change_pct ?? null, color: 'var(--text-3)' },
  ]
  const maxAbs = Math.max(...benchRows.map(r => Math.abs(r.pct ?? 0)), 1)
  const outperformed = btcBench?.outperformed

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="aa-skel" style={{ height: 12, width: 90 }} />
          <div className="aa-skel" style={{ height: 34, width: 380 }} />
        </div>
        <div className="aa-skel" style={{ height: 200 }} />
        <div className="aa-skel" style={{ height: 220 }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* Header */}
      <div className="aa-sec aa-sec--1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Analytics</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-1)', margin: '6px 0 0' }}>
          Entendé en qué estás parado
        </h1>
      </div>

      {/* ANÁLISIS DE UN ACTIVO — valor actual + histórico de mercado */}
      {selected && (
        <section className="aa-sec aa-sec--2">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={OVERLINE_MUTED}>Analizá un activo</span>
            <div className="aa-seg">
              {[7, 30, 90].map(d => (
                <button key={d} className={`aa-seg__opt${chartDays === d ? ' aa-seg__opt--on' : ''}`} onClick={() => setChartDays(d)}>{d}d</button>
              ))}
            </div>
          </div>

          {/* Selector de activo (chips de los que tenés) */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18 }}>
            {assetOptions.map(a => {
              const on = a.symbol === selected.symbol
              return (
                <button key={a.symbol} onClick={() => setSelectedSymbol(a.symbol)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px 7px 8px', borderRadius: 999, flexShrink: 0, cursor: 'pointer',
                    background: on ? 'var(--accent-bg)' : 'var(--surface-inset)',
                    border: `1px solid ${on ? 'var(--border-focus)' : 'var(--border-2)'}`,
                    color: on ? 'var(--text-accent)' : 'var(--text-1)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>
                  <AssetAvatar symbol={a.symbol} category={a.category} logoUrl={a.logo_url} size={22} />
                  {a.symbol}
                </button>
              )
            })}
          </div>

          {/* Valor actual + variación del período */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 2 }}>{selected.name || selected.symbol}</div>
              <div style={{ ...MONO, fontSize: 30, fontWeight: 700, color: 'var(--text-1)' }}>{format(selected.price_usd, rate)}</div>
            </div>
            {chart && (
              <div style={{ ...MONO, fontSize: 15, fontWeight: 700, color: chart.up ? 'var(--positive)' : 'var(--negative)', paddingBottom: 4 }}>
                {chart.up ? '+' : '−'}{Math.abs(chart.changePct).toFixed(1).replace('.', ',')}% · {chartDays}d
              </div>
            )}
          </div>

          {/* Gráfico */}
          {historyLoading ? (
            <div className="aa-skel" style={{ height: 240 }} />
          ) : chart ? (
            <PriceChart points={chart.pts} up={chart.up} />
          ) : (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-3)', fontSize: 13, border: '1px dashed var(--border-2)', borderRadius: 'var(--radius-md)', padding: '0 20px' }}>
              Mostramos el valor actual de {selected.name || selected.symbol}. Su serie histórica no está disponible por ahora (sin fuente gratuita para este activo).
            </div>
          )}
        </section>
      )}

      {/* DISTRIBUCIÓN POR TIPO DE ACTIVO */}
      <section className="aa-sec aa-sec--2">
        <span style={{ ...OVERLINE_MUTED, display: 'block', marginBottom: 14 }}>Distribución por tipo de activo</span>
        {types.length === 0 ? (
          <div style={{ padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>Sin datos de portfolio todavía.</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4, height: 8, marginBottom: 6 }}>
              {types.map(t => (
                <div key={t.label} style={{ width: `${t.percentage}%`, minWidth: t.percentage > 0 ? 8 : 0, background: t.color, borderRadius: 999 }} />
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', columnGap: 48 }}>
              {types.map(t => {
                const subs = symbolsByType.get((t.category || t.label).toLowerCase()) ?? symbolsByType.get(t.label.toLowerCase()) ?? []
                return (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-1)' }}>
                    <div style={{ width: 9, height: 9, borderRadius: 2.5, background: t.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{t.label}</div>
                      {subs.length > 0 && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{subs.join(', ')}</div>}
                    </div>
                    <span style={{ ...MONO, fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{format(t.usd_value, rate)}</span>
                    <span style={{ ...MONO, fontSize: 12, color: 'var(--text-3)', width: 48, textAlign: 'right' }}>{t.percentage.toFixed(1).replace('.', ',')}%</span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* BENCHMARK · 30 DÍAS */}
      <section className="aa-sec aa-sec--3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={OVERLINE_MUTED}>Benchmark · 30 días</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>¿Le ganaste al mercado?</span>
        </div>
        {benchRows.map(r => <BenchRow key={r.label} {...r} maxAbs={maxAbs} />)}
        {typeof outperformed === 'boolean' && btcBench?.portfolio_change_pct !== null && (
          <div style={{
            marginTop: 18, padding: '13px 16px', borderRadius: 'var(--radius-md)',
            border: `1px solid ${outperformed ? 'rgba(0,200,150,0.3)' : 'rgba(255,77,109,0.3)'}`,
            background: outperformed ? 'rgba(0,200,150,0.06)' : 'rgba(255,77,109,0.06)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: outperformed ? 'var(--positive)' : 'var(--negative)',
          }}>
            <span style={{ fontSize: 14 }}>{outperformed ? '✓' : '✕'}</span>
            <span style={{ color: 'var(--text-2)' }}>
              {outperformed
                ? `Tu portfolio le ganó a Bitcoin este mes por ${(Math.abs((btcBench!.portfolio_change_pct ?? 0) - (btcBench!.asset_change_pct ?? 0))).toFixed(1).replace('.', ',')} puntos.`
                : `Bitcoin le ganó a tu portfolio este mes por ${(Math.abs((btcBench!.asset_change_pct ?? 0) - (btcBench!.portfolio_change_pct ?? 0))).toFixed(1).replace('.', ',')} puntos.`}
            </span>
          </div>
        )}
      </section>

      {/* CONCENTRACIÓN */}
      {concentration && (
        <section className="aa-sec aa-sec--4">
          <span style={{ ...OVERLINE_MUTED, display: 'block', marginBottom: 18 }}>Concentración</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
            <div>
              <div style={{ ...MONO, fontSize: 30, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                {concentration.top.percentage.toFixed(1).replace('.', ',')}%
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                de tu patrimonio está en un solo activo ({concentration.top.label}). Alta exposición a su volatilidad.
              </p>
            </div>
            <div>
              <div style={{ ...MONO, fontSize: 30, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
                {concentration.dollarPct.toFixed(1).replace('.', ',')}%
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                dolarizado (cripto + CEDEARs + bonos). Cobertura contra el peso.
              </p>
            </div>
            <div>
              <div style={{ ...MONO, fontSize: 30, fontWeight: 700, color: 'var(--warning)', marginBottom: 6 }}>
                {concentration.pesosPct.toFixed(1).replace('.', ',')}%
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>
                en pesos líquidos, expuesto a la inflación.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
