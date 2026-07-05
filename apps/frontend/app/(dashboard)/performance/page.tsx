'use client'

import { useState } from 'react'
import { Card } from '@/components/ds/Card'
import { Delta } from '@/components/ds/Delta'
import { useProviderPerformance, usePortfolio } from '@/hooks/usePortfolio'
import { formatMoneyDual } from '@/components/ds/Stat'
import type { ProviderPerformanceItem } from '@/lib/types'

const PROVIDER_COLORS: Record<string, string> = {
  binance: '#E8C268', mercadopago: '#63B8F4', bullmarket: '#3DD993', bullmarket_csv: '#3DD993',
  lemoncash: '#45D4C8', iol: '#9D8CFF', onchain: '#F08FB7',
  solana: '#B5D85A', balanz_csv: '#F4626E', manual: '#8A97AB',
}
const FALLBACK = ['#41A4EF','#63B8F4','#00B1EA','#00C896','#FFB454','#8FC8F6']
function pColor(name: string, idx: number) { return PROVIDER_COLORS[name] ?? FALLBACK[idx % FALLBACK.length] }

const PERIODS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '1 año', days: 365 },
]

function ChartIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
}

function MiniSparkline({ data, color }: { data: { date: string; balance_usd: number }[]; color: string }) {
  if (data.length < 2) return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Sin datos aún</span></div>
  const W = 240, H = 80
  const vals = data.map(d => d.balance_usd)
  const minV = Math.min(...vals), maxV = Math.max(...vals), rng = maxV - minV || 1
  const xs = vals.map((_, i) => (i / (vals.length - 1)) * W)
  const ys = vals.map(v => H - 8 - ((v - minV) / rng) * (H - 16))
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${path} L${xs[xs.length-1]},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 80, display: 'block' }}>
      <path d={area} fill={color} fillOpacity="0.1" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SummaryTable({ providers }: { providers: ProviderPerformanceItem[] }) {
  const { data: portfolio } = usePortfolio()
  return (
    <Card padding="none">
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>Resumen por cuenta</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr>
              {['Cuenta', 'Actual', '24h', '7d', '30d'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i >= 1 ? 'right' : 'left', fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {providers.map((p, i) => (
              <tr key={p.provider} style={{ borderBottom: '1px solid var(--border-1)' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: pColor(p.provider, i), flexShrink: 0 }} />
                    <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--text-1)' }}>{p.label}</span>
                  </div>
                </td>
                <td className="aa-num" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{formatMoneyDual(p.current_usd, portfolio?.usd_to_ars)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.change_pct_24h !== null ? <Delta value={p.change_pct_24h} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.change_pct_7d !== null ? <Delta value={p.change_pct_7d} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{p.change_pct_30d !== null ? <Delta value={p.change_pct_30d} /> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ProviderMiniCard({ provider, idx }: { provider: ProviderPerformanceItem; idx: number }) {
  const c = pColor(provider.provider, idx)
  const { data: portfolio } = usePortfolio()
  return (
    <Card padding="md">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: '#fff', flexShrink: 0 }}>
            {provider.label.charAt(0)}
          </div>
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>{provider.label}</p>
            <p className="aa-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>{formatMoneyDual(provider.current_usd, portfolio?.usd_to_ars)}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>24h</span>
            {provider.change_pct_24h !== null ? <Delta value={provider.change_pct_24h} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>—</span>}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)' }}>30d</span>
            {provider.change_pct_30d !== null ? <Delta value={provider.change_pct_30d} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-xs)' }}>—</span>}
          </div>
        </div>
      </div>
      <MiniSparkline data={provider.history} color={c} />
    </Card>
  )
}

export default function PerformancePage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useProviderPerformance(days)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Rendimiento</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Evolución de cada cuenta en el tiempo</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', padding: 4 }}>
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', border: 'none', cursor: 'pointer', transition: 'all var(--dur-fast) var(--ease-out)',
                background: days === p.days ? 'var(--surface-card)' : 'transparent',
                color: days === p.days ? 'var(--text-1)' : 'var(--text-3)',
                boxShadow: days === p.days ? 'var(--shadow-sm)' : 'none' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[140, 320, 140].map((h, i) => <div key={i} style={{ height: h, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />)}
        </div>
      ) : !data || data.providers.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '24px 0', color: 'var(--text-3)' }}>
            <ChartIcon />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>No hay datos de performance disponibles.</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>Asegurate de tener cuentas conectadas en Integraciones.</p>
          </div>
        </Card>
      ) : (
        <>
          <SummaryTable providers={data.providers} />
          <div>
            <span className="aa-overline" style={{ display: 'block', marginBottom: 12 }}>Por cuenta</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {data.providers.map((p, i) => <ProviderMiniCard key={p.provider} provider={p} idx={i} />)}
            </div>
          </div>
        </>
      )}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
