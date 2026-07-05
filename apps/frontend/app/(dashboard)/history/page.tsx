'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ds/Card'
import { Delta } from '@/components/ds/Delta'
import { usePortfolioHistory, usePortfolio } from '@/hooks/usePortfolio'
import { formatMoneyDual } from '@/components/ds/Stat'

type Range = '7d' | '30d' | '90d' | '1y'

const RANGES: { label: string; value: Range; days: number }[] = [
  { label: '7 días', value: '7d', days: 7 },
  { label: '30 días', value: '30d', days: 30 },
  { label: '90 días', value: '90d', days: 90 },
  { label: '1 año', value: '1y', days: 365 },
]

function isoFrom(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function formatDate(iso: string, short = false) {
  return new Date(iso).toLocaleDateString('es-AR', short ? { day: '2-digit', month: 'short' } : { dateStyle: 'medium' })
}

const LINE_COLOR = '#63B8F4'
const GRID_COLOR = 'rgba(255,255,255,0.06)'
const AREA_FILL = 'rgba(99,184,244,0.08)'

function LineChart({ points, rate }: { points: { date: string; usd: number }[]; rate?: number | null }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: typeof points[0] } | null>(null)

  if (points.length < 2) {
    return (
      <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>
        <span>Sin suficientes datos para el gráfico</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>El historial se acumula con cada visita al dashboard.</span>
      </div>
    )
  }

  const W = 720, H = 240, PX = 52, PY = 16
  const minY = Math.min(...points.map(p => p.usd))
  const maxY = Math.max(...points.map(p => p.usd))
  const rangeY = maxY - minY || 1
  const xs = points.map((_, i) => PX + (i / (points.length - 1)) * (W - PX - 8))
  const ys = points.map(p => PY + ((1 - (p.usd - minY) / rangeY)) * (H - PY - 28))

  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${path} L${xs[xs.length - 1]},${H - 28} L${xs[0]},${H - 28} Z`

  const yTicks = [minY, minY + rangeY / 2, maxY]
  const xStep = Math.ceil(points.length / 5)
  const xTicks = points.filter((_, i) => i % xStep === 0 || i === points.length - 1)
  const xTickIdxs = xTicks.map(t => points.indexOf(t))

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * W
    let closest = 0
    let minDist = Infinity
    xs.forEach((x, i) => { const d = Math.abs(x - mx); if (d < minDist) { minDist = d; closest = i } })
    setTooltip({ x: xs[closest], y: ys[closest], point: points[closest] })
  }, [xs, ys, points])

  return (
    <div style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        {/* Grid lines */}
        {yTicks.map((_, i) => {
          const gy = PY + (1 - i / 2) * (H - PY - 28)
          return <line key={i} x1={PX} y1={gy} x2={W - 8} y2={gy} stroke={GRID_COLOR} strokeWidth="1" />
        })}
        {/* Y axis labels */}
        {yTicks.map((v, i) => {
          const gy = PY + (1 - i / 2) * (H - PY - 28)
          return <text key={i} x={PX - 6} y={gy + 4} textAnchor="end" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">{v >= 1000 ? `$${(v/1000).toFixed(1)}k` : `$${v.toFixed(0)}`}</text>
        })}
        {/* Area fill */}
        <path d={area} fill={AREA_FILL} />
        {/* Line */}
        <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* X axis labels */}
        {xTickIdxs.map((idx, i) => (
          <text key={i} x={xs[idx]} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--text-3)" fontFamily="var(--font-mono)">
            {formatDate(points[idx].date, true)}
          </text>
        ))}
        {/* Tooltip dot */}
        {tooltip && <>
          <line x1={tooltip.x} y1={PY} x2={tooltip.x} y2={H - 28} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3" />
          <circle cx={tooltip.x} cy={tooltip.y} r="4" fill={LINE_COLOR} stroke="var(--surface-card)" strokeWidth="2" />
        </>}
      </svg>
      {tooltip && (
        <div style={{ position: 'absolute', left: `${(tooltip.x / W) * 100}%`, top: `${(tooltip.y / H) * 100}%`, transform: 'translate(-50%,-110%)', pointerEvents: 'none', background: 'var(--surface-elevated)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', padding: '6px 10px', fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
          <div style={{ color: 'var(--text-3)' }}>{formatDate(tooltip.point.date)}</div>
          <div className="aa-num" style={{ color: 'var(--text-1)', fontWeight: 'var(--weight-bold)' }}>{formatMoneyDual(tooltip.point.usd, rate)}</div>
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [range, setRange] = useState<Range>('30d')
  const rangeConfig = RANGES.find(r => r.value === range)!
  // Memoizado: un "from" nuevo por render cambia la queryKey y provoca
  // refetch infinito (429).
  const fromIso = useMemo(() => isoFrom(rangeConfig.days), [rangeConfig.days])
  const { data, isLoading } = usePortfolioHistory(fromIso)
  const { data: portfolio } = usePortfolio()

  const points = data?.points.map(p => ({ date: p.snapshot_at, usd: p.total_usd })) ?? []
  const noIntegrations = !portfolio || portfolio.providers.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Historial</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Evolución del valor total de tu portfolio</p>
      </div>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {RANGES.map(r => (
          <button key={r.value} onClick={() => setRange(r.value)}
            style={{ padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', border: '1px solid', cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-out)',
              background: range === r.value ? 'var(--action-primary)' : 'transparent',
              borderColor: range === r.value ? 'var(--action-primary)' : 'var(--border-1)',
              color: range === r.value ? '#fff' : 'var(--text-2)' }}>
            {r.label}
          </button>
        ))}
      </div>

      {noIntegrations && (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
            El historial se empieza a acumular cuando tenés al menos una integración conectada.
          </p>
          <Link href="/integrations" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-accent)' }}>
            Conectar cuenta →
          </Link>
        </div>
      )}

      <Card padding="md">
        {isLoading
          ? <div style={{ height: 280, background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />
          : <LineChart points={points} rate={data?.usd_to_ars} />}
      </Card>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Card padding="md">
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 6px' }}>Cambio 24h</p>
            {data.change_pct_24h !== null ? <Delta value={data.change_pct_24h} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>Sin datos</span>}
          </Card>
          <Card padding="md">
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 6px' }}>Cambio 30d</p>
            {data.change_pct_30d !== null ? <Delta value={data.change_pct_30d} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>Sin datos</span>}
          </Card>
        </div>
      )}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
