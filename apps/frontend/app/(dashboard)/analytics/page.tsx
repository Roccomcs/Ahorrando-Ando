'use client'

import { useState } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Delta } from '@/components/ds/Delta'
import { useAllocation, useROI, useBenchmark } from '@/hooks/usePortfolio'
import { formatMoney } from '@/components/ds/Stat'
import { api } from '@/lib/api'

const CHART_COLORS = ['#63B8F4','#E8C268','#3DD993','#9D8CFF','#45D4C8','#F08FB7','#F4626E','#B5D85A']

type AllocationView = 'by_asset' | 'by_provider' | 'by_type'
const VIEW_LABELS: Record<AllocationView, string> = {
  by_asset: 'Por activo',
  by_provider: 'Por broker',
  by_type: 'Por tipo',
}

function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
}

function MiniDonut({ items }: { items: { label: string; percentage: number; color: string }[] }) {
  const cx = 60, cy = 60, r = 50, ri = 32
  let angle = -90
  const slices = items.map(d => {
    const sweep = (d.percentage / 100) * 360
    const a1 = angle, a2 = angle + sweep - 0.5
    angle += sweep
    const toRad = (a: number) => (a * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1))
    const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2))
    const ix1 = cx + ri * Math.cos(toRad(a2)), iy1 = cy + ri * Math.sin(toRad(a2))
    const ix2 = cx + ri * Math.cos(toRad(a1)), iy2 = cy + ri * Math.sin(toRad(a1))
    const large = sweep > 180 ? 1 : 0
    return { ...d, d: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${ri},${ri} 0 ${large},0 ${ix2},${iy2} Z` }
  })
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
    </svg>
  )
}

const pillStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', cursor: 'pointer', border: '1px solid',
  background: active ? 'var(--surface-inset)' : 'transparent',
  borderColor: active ? 'var(--border-2)' : 'transparent',
  color: active ? 'var(--text-1)' : 'var(--text-3)',
})

function AllocationSection() {
  const { data, isLoading } = useAllocation()
  const [view, setView] = useState<AllocationView>('by_asset')

  if (isLoading) return <div style={{ height: 260, background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />
  if (!data || data.total_usd === 0) return (
    <Card padding="md"><p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>Sin datos de portfolio todavía.</p></Card>
  )

  const items = data[view].slice(0, 8).map((it: { label: string; usd_value: number; percentage: number }, i: number) => ({ ...it, color: CHART_COLORS[i % CHART_COLORS.length] }))

  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>Distribución del portfolio</p>
        <div style={{ display: 'flex', gap: 4 }}>
          {(Object.keys(VIEW_LABELS) as AllocationView[]).map(v => (
            <button key={v} onClick={() => setView(v)} style={pillStyle(view === v)}>{VIEW_LABELS[v]}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <MiniDonut items={items} />
        <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item: { label: string; usd_value: number; percentage: number; color: string }) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-2)', fontWeight: 'var(--weight-medium)' }}>{item.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span className="aa-num" style={{ color: 'var(--text-1)', fontWeight: 'var(--weight-medium)' }}>{formatMoney(item.usd_value)}</span>
                <span style={{ color: 'var(--text-3)', width: 36, textAlign: 'right' }}>{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ROISection() {
  const { data, isLoading } = useROI()

  if (isLoading) return <div style={{ height: 140, background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />
  if (!data || data.length === 0) return null

  return (
    <Card padding="none">
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>Rendimiento por activo</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr>
              {['Activo', 'Broker', 'Valor USD', '24h', '30d'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item: { asset_symbol: string; asset_name: string; provider: string; current_value_usd: number; performance_24h: number | null; performance_30d: number | null }, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-1)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{item.asset_symbol}</span>
                  <span style={{ color: 'var(--text-3)', marginLeft: 6, fontSize: 'var(--text-xs)' }}>{item.asset_name}</span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-2)', textTransform: 'capitalize' }}>{item.provider}</td>
                <td className="aa-num" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'var(--weight-medium)', color: 'var(--text-1)' }}>{formatMoney(item.current_value_usd)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{item.performance_24h !== null ? <Delta value={item.performance_24h} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{item.performance_30d !== null ? <Delta value={item.performance_30d} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function BenchmarkSection() {
  const [asset, setAsset] = useState('BTC')
  const [period, setPeriod] = useState('30d')
  const { data, isLoading } = useBenchmark(asset, period)

  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>Benchmarking</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {['BTC', 'ETH'].map(a => <button key={a} onClick={() => setAsset(a)} style={pillStyle(asset === a)}>{a}</button>)}
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {['7d', '30d', '90d'].map(p => <button key={p} onClick={() => setPeriod(p)} style={pillStyle(period === p)}>{p}</button>)}
          </div>
        </div>
      </div>

      {isLoading && <div style={{ height: 80, background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', padding: 16 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 6px' }}>Tu portfolio ({period})</p>
            {data.portfolio_change_pct !== null ? <Delta value={data.portfolio_change_pct} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>—</span>}
            {data.snapshot_count < 2 && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '4px 0 0' }}>Necesitás más historial</p>}
          </div>
          <div style={{ borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', padding: 16 }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 6px' }}>{data.benchmark_asset} ({period})</p>
            {data.asset_change_pct !== null ? <Delta value={data.asset_change_pct} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>—</span>}
          </div>
          {data.portfolio_change_pct !== null && data.asset_change_pct !== null && (
            <div style={{ gridColumn: '1 / -1', borderRadius: 'var(--radius-md)', background: data.outperformed ? 'rgba(61,217,147,0.08)' : 'rgba(244,98,110,0.08)', border: `1px solid ${data.outperformed ? 'rgba(61,217,147,0.25)' : 'rgba(244,98,110,0.25)'}`, padding: '10px 14px', fontSize: 'var(--text-sm)', color: data.outperformed ? 'var(--up)' : 'var(--down)', fontWeight: 'var(--weight-medium)' }}>
              {data.outperformed
                ? `Tu portfolio superó a ${data.benchmark_asset} por ${(data.portfolio_change_pct - data.asset_change_pct).toFixed(2)}pp`
                : `${data.benchmark_asset} te ganó por ${(data.asset_change_pct - data.portfolio_change_pct).toFixed(2)}pp`}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsPage() {
  function handleExport() {
    api.get('/api/v1/dashboard/export?days=365', { responseType: 'blob' }).then(res => {
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'portfolio.csv'; a.click()
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Analytics</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Análisis detallado de tu portfolio</p>
        </div>
        <Button variant="secondary" size="sm" icon={<DownloadIcon />} onClick={handleExport}>Exportar CSV</Button>
      </div>
      <AllocationSection />
      <ROISection />
      <BenchmarkSection />
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
