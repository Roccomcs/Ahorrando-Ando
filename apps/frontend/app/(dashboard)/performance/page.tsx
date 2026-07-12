'use client'

import { useMemo } from 'react'
import { Delta } from '@/components/ds/Delta'
import { AssetAvatar, CATEGORY_LABEL } from '@/components/ds/AssetAvatar'
import { useProviderPerformance, usePortfolio, usePortfolioHistory, useROI } from '@/hooks/usePortfolio'
import { useCurrency } from '@/lib/currency-context'
import type { AssetCategory } from '@/lib/types'

const OVERLINE: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--primary)',
}
const OVERLINE_MUTED: React.CSSProperties = { ...OVERLINE, color: 'var(--text-3)' }
const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }

function isoFrom(days: number) {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString()
}

/* ── Barras de PnL mensual ──────────────────────────────────── */
interface MonthPnl { label: string; pnl: number }

function MonthlyBars({ months, format, rate }: { months: MonthPnl[]; format: (v: number, r?: number | null) => string; rate?: number | null }) {
  if (months.length === 0) {
    return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontSize: 13 }}>El PnL mensual se construye a medida que se acumula historial.</div>
  }
  const maxAbs = Math.max(...months.map(m => Math.abs(m.pnl)), 1)
  const H = 210, BAR_MAX = 150
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, height: H, paddingTop: 24 }}>
      {months.map(m => {
        const positive = m.pnl >= 0
        const hgt = Math.max(8, (Math.abs(m.pnl) / maxAbs) * BAR_MAX)
        const color = positive ? 'var(--positive)' : 'var(--negative)'
        return (
          <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, maxWidth: 96 }}>
            <span style={{ ...MONO, fontSize: 12, fontWeight: 600, color }}>
              {positive ? '+' : '−'}{format(Math.abs(m.pnl), rate)}
            </span>
            <div style={{
              width: '100%', maxWidth: 64, height: hgt, borderRadius: '8px 8px 3px 3px',
              background: positive
                ? 'linear-gradient(180deg, #00C896 0%, rgba(0,200,150,0.45) 100%)'
                : 'linear-gradient(180deg, #FF4D6D 0%, rgba(255,77,109,0.45) 100%)',
            }} />
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-3)' }}>{m.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function MoverRow({ name, symbol, category, logoUrl, pct, maxAbs, kind }: { name: string; symbol: string; category?: AssetCategory | null; logoUrl?: string | null; pct: number; maxAbs: number; kind: 'up' | 'down' }) {
  const color = kind === 'up' ? 'var(--positive)' : 'var(--negative)'
  const width = Math.max(6, (Math.abs(pct) / (maxAbs || 1)) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      <AssetAvatar symbol={symbol} category={category} logoUrl={logoUrl} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{name}</div>
        <div style={{ height: 5, background: 'var(--surface-hover)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 999 }} />
        </div>
      </div>
      <span style={{ ...MONO, fontSize: 13, fontWeight: 600, color, flexShrink: 0 }}>
        {pct >= 0 ? '+' : '−'}{Math.abs(pct).toFixed(1).replace('.', ',')}%
      </span>
    </div>
  )
}

export default function PerformancePage() {
  const { data, isLoading } = useProviderPerformance(30)
  const { data: portfolio } = usePortfolio()
  const fromIso = useMemo(() => isoFrom(365), [])
  const { data: yearHistory } = usePortfolioHistory(fromIso)
  const { data: roi } = useROI()
  const { format } = useCurrency()

  const rate = portfolio?.usd_to_ars

  // PnL 30 días: suma de (actual - inicio de la serie) por cuenta.
  const pnl30 = useMemo(() => {
    if (!data) return null
    let start = 0, current = 0, any = false
    for (const p of data.providers) {
      if (p.history.length >= 2) {
        start += p.history[0].balance_usd
        current += p.current_usd
        any = true
      }
    }
    if (!any || start === 0) return null
    return { abs: current - start, pct: ((current - start) / start) * 100 }
  }, [data])

  // PnL mensual desde los snapshots del último año (últimos 6 meses con datos).
  const months = useMemo<MonthPnl[]>(() => {
    const pts = yearHistory?.points ?? []
    if (pts.length < 2) return []
    const byMonth = new Map<string, { first: number; last: number }>()
    for (const p of pts) {
      const d = new Date(p.snapshot_at)
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
      const e = byMonth.get(key)
      if (!e) byMonth.set(key, { first: p.total_usd, last: p.total_usd })
      else e.last = p.total_usd
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => {
        const [y, m] = key.split('-').map(Number)
        const label = new Date(y, m, 1).toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
        return { label, pnl: v.last - v.first }
      })
  }, [yearHistory])

  // Ganadores / rezagados 30d desde el ROI real por activo.
  const movers = useMemo(() => {
    const items = (roi ?? []).filter(r => typeof r.performance_30d === 'number')
    if (items.length === 0) return { winners: [], laggards: [], maxAbs: 0 }
    const sorted = [...items].sort((a, b) => b.performance_30d - a.performance_30d)
    const winners = sorted.filter(r => r.performance_30d > 0).slice(0, 3)
    const laggards = sorted.filter(r => r.performance_30d < 0).slice(-3).reverse()
    const maxAbs = Math.max(...items.map(r => Math.abs(r.performance_30d)))
    return { winners, laggards, maxAbs }
  }, [roi])

  // Activos individuales (con logo y nombre real), ordenados por valor.
  const assetRows = useMemo(
    () => [...(roi ?? [])].sort((a, b) => b.current_value_usd - a.current_value_usd),
    [roi],
  )

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="aa-skel" style={{ height: 12, width: 110 }} />
            <div className="aa-skel" style={{ height: 34, width: 340 }} />
            <div className="aa-skel" style={{ height: 14, width: 280 }} />
          </div>
          <div className="aa-skel" style={{ height: 64, width: 180 }} />
        </div>
        <div className="aa-skel" style={{ height: 220 }} />
        <div className="aa-skel" style={{ height: 240 }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
      {/* Header */}
      <div className="aa-sec aa-sec--1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span style={{ ...OVERLINE, color: 'var(--text-1)' }}>Performance</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-1)', margin: '6px 0 6px' }}>
            Cuánto rinde cada cuenta
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>PnL realizado + no realizado, comparado lado a lado.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ ...OVERLINE_MUTED, fontFamily: 'var(--font-mono)' }}>PNL 30 días</span>
          {pnl30 ? (
            <>
              <div style={{ ...MONO, fontSize: 30, fontWeight: 700, color: pnl30.abs >= 0 ? 'var(--positive)' : 'var(--negative)', margin: '6px 0 2px' }}>
                {pnl30.abs >= 0 ? '+' : '−'}{format(Math.abs(pnl30.abs), rate)}
              </div>
              <Delta value={pnl30.pct} size="md" />
            </>
          ) : (
            <div style={{ ...MONO, fontSize: 22, color: 'var(--text-3)', marginTop: 6 }}>—</div>
          )}
        </div>
      </div>

      {/* RESUMEN POR ACTIVO */}
      <section className="aa-sec aa-sec--2">
        <span style={{ ...OVERLINE_MUTED, display: 'block', marginBottom: 14 }}>Resumen por activo</span>
        <div className="aa-tablewrap" role="region" aria-label="Resumen por activo" tabIndex={0}>
          <div role="table">
            <div role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 2fr) 1fr 1fr 0.7fr 0.7fr', gap: 8, padding: '0 0 10px', borderBottom: '1px solid var(--border-1)' }}>
              {['Activo', 'Cantidad', 'Actual', '24h', '30d'].map((h, i) => (
                <span role="columnheader" key={i} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: i >= 1 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {assetRows.map((a) => (
              <div role="row" key={a.asset_symbol + a.provider} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 2fr) 1fr 1fr 0.7fr 0.7fr', gap: 8, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-1)' }}>
                <div role="cell" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <AssetAvatar symbol={a.asset_symbol} category={a.category} logoUrl={a.logo_url} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.asset_name || a.asset_symbol}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.category ? CATEGORY_LABEL[a.category] : a.asset_symbol}</div>
                  </div>
                </div>
                <span role="cell" style={{ ...MONO, fontSize: 13, color: 'var(--text-2)', textAlign: 'right' }}>{a.amount.toLocaleString('es-AR', { maximumFractionDigits: 6 })}</span>
                <span role="cell" style={{ ...MONO, fontSize: 14, fontWeight: 700, color: 'var(--text-1)', textAlign: 'right' }}>{format(a.current_value_usd, rate)}</span>
                {[a.performance_24h, a.performance_30d].map((v, j) => (
                  <span role="cell" key={j} style={{ textAlign: 'right' }}>
                    {typeof v === 'number' ? <Delta value={v} /> : <span style={{ ...MONO, color: 'var(--text-3)', fontSize: 13 }}>—</span>}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        {assetRows.length === 0 && (
          <div style={{ padding: '28px 0', color: 'var(--text-3)', fontSize: 13 }}>
            No hay activos todavía. Cargá o conectá cuentas en Integraciones.
          </div>
        )}
      </section>

      {/* PNL MENSUAL */}
      <section className="aa-sec aa-sec--3">
        <span style={{ ...OVERLINE_MUTED, display: 'block', marginBottom: 4 }}>PnL mensual</span>
        <MonthlyBars months={months} format={format} rate={rate} />
      </section>

      {/* GANADORES / REZAGADOS */}
      {(movers.winners.length > 0 || movers.laggards.length > 0) && (
        <section className="aa-sec aa-sec--4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40 }}>
          <div>
            <span style={{ ...OVERLINE, color: 'var(--positive)', display: 'block', marginBottom: 8 }}>Ganadores · 30d</span>
            {movers.winners.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin activos en positivo este mes.</span>}
            {movers.winners.map(w => (
              <MoverRow key={w.asset_symbol + w.provider} name={w.asset_name || w.asset_symbol} symbol={w.asset_symbol} category={w.category} logoUrl={w.logo_url} pct={w.performance_30d} maxAbs={movers.maxAbs} kind="up" />
            ))}
          </div>
          <div>
            <span style={{ ...OVERLINE, color: 'var(--negative)', display: 'block', marginBottom: 8 }}>Rezagados · 30d</span>
            {movers.laggards.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Sin activos en negativo este mes.</span>}
            {movers.laggards.map(l => (
              <MoverRow key={l.asset_symbol + l.provider} name={l.asset_name || l.asset_symbol} symbol={l.asset_symbol} category={l.category} logoUrl={l.logo_url} pct={l.performance_30d} maxAbs={movers.maxAbs} kind="down" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
