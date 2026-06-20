'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePortfolio, useRefreshPortfolio } from '@/hooks/usePortfolio'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Badge } from '@/components/ds/Badge'
import { Delta } from '@/components/ds/Delta'
import { Stat, formatMoney } from '@/components/ds/Stat'
import { EmptyState } from '@/components/ds/EmptyState'
import { ProviderMark } from '@/components/ds/ProviderMark'
import type { PortfolioSummaryDTO, ProviderSummaryDTO } from '@/lib/types'

const CHART_COLORS = ['#63B8F4','#E8C268','#3DD993','#9D8CFF','#45D4C8','#F08FB7','#F4626E','#B5D85A','#8A97AB']

const PROVIDER_LABELS: Record<string, string> = {
  binance: 'Binance', mercadopago: 'Mercado Pago', bullmarket: 'Bull Market',
  lemoncash: 'Lemon', iol: 'IOL', onchain: 'Wallet EVM',
  solana: 'Solana', balanz_csv: 'Balanz', manual: 'Manual',
}

function label(p: string) { return PROVIDER_LABELS[p] ?? p }

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function ChevronDown() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
}

function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
}

function ZapIcon() {
  return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}

function PortfolioDonut({ portfolio }: { portfolio: PortfolioSummaryDTO }) {
  const total = portfolio.total_usd
  const data = portfolio.providers.map((p, i) => ({
    name: label(p.provider),
    value: p.balance_usd,
    pct: total > 0 ? (p.balance_usd / total) * 100 : 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  if (data.length === 0) return null

  const cx = 90, cy = 90, r = 72, ri = 48
  let angle = -90
  const slices = data.map(d => {
    const sweep = (d.pct / 100) * 360
    const a1 = angle, a2 = angle + sweep - 1
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Total</span>
          <span className="aa-num" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)' }}>
            US${total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toFixed(0)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 160 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
            </div>
            <span style={{ color: 'var(--text-3)', marginLeft: 8, flexShrink: 0 }}>{d.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProviderRow({ provider, totalUsd, idx, defaultOpen }: { provider: ProviderSummaryDTO; totalUsd: number; idx: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const pct = totalUsd > 0 ? (provider.balance_usd / totalUsd) * 100 : 0
  const color = CHART_COLORS[idx % CHART_COLORS.length]

  return (
    <div style={{ border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--surface-card)', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background var(--dur-fast) var(--ease-out)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-card)')}
      >
        <ProviderMark provider={provider.provider} label={label(provider.provider)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{label(provider.provider)}</span>
            <span className="aa-num" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)' }}>
              {formatMoney(provider.balance_usd)}
            </span>
          </div>
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: 'var(--surface-inset)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 'var(--radius-full)' }} />
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', flexShrink: 0, width: 28, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
          </div>
        </div>
        <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{open ? <ChevronDown /> : <ChevronRight />}</span>
      </button>

      {open && provider.holdings.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-1)' }}>
          {provider.holdings.map(h => (
            <div key={h.asset_symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-2xs)', fontWeight: 'var(--weight-bold)', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                  {h.asset_symbol.slice(0, 2)}
                </div>
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-1)', margin: 0 }}>{h.asset_symbol}</p>
                  <p className="aa-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>
                    {h.amount.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="aa-num" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-1)', margin: 0 }}>
                  {formatMoney(h.current_value_usd)}
                </p>
                {h.performance_24h !== null && <Delta value={h.performance_24h} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && provider.holdings.length === 0 && (
        <div style={{ borderTop: '1px solid var(--border-1)', padding: '12px 16px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Sin activos individuales para este provider.</span>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { data: portfolio, isLoading, error } = usePortfolio()
  const refresh = useRefreshPortfolio()

  if (isLoading) return <Skeleton />

  if (error) {
    return (
      <Card padding="lg">
        <span style={{ color: 'var(--down)', fontSize: 'var(--text-sm)' }}>Error al cargar el portfolio. Verificá tu conexión.</span>
      </Card>
    )
  }

  if (portfolio?.providers.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <PageHeader onRefresh={() => refresh.mutate()} loading={refresh.isPending} />
        <Card padding="lg">
          <EmptyState
            icon={<ZapIcon />}
            title="Bienvenido a Ahorrando Ando"
            body="Conectá tu primera cuenta financiera para ver tus activos unificados acá."
            action={
              <Link href="/integrations">
                <Button>Conectar primera cuenta</Button>
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader onRefresh={() => refresh.mutate()} loading={refresh.isPending} />

      {/* Hero */}
      <Card padding="lg">
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Stat
              label="Total del portfolio"
              value={formatMoney(portfolio!.total_usd)}
              size="lg"
            />
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: 4 }}>24 h</span>
                {portfolio!.change_pct_24h !== null ? <Delta value={portfolio!.change_pct_24h} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>—</span>}
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--border-1)' }} />
              <div>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: 4 }}>30 d</span>
                {portfolio!.change_pct_30d !== null ? <Delta value={portfolio!.change_pct_30d} /> : <span style={{ color: 'var(--text-3)', fontSize: 'var(--text-sm)' }}>—</span>}
              </div>
              <div style={{ width: 1, height: 32, background: 'var(--border-1)' }} />
              <div>
                <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: 4 }}>Cuentas</span>
                <span className="aa-num" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)' }}>{portfolio!.providers.length}</span>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/history"><Button variant="secondary" size="sm">Ver historial</Button></Link>
              <Link href="/analytics"><Button variant="secondary" size="sm">Analytics</Button></Link>
              <Link href="/integrations"><Button variant="ghost" size="sm">+ Agregar cuenta</Button></Link>
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <PortfolioDonut portfolio={portfolio!} />
          </div>
        </div>
      </Card>

      {/* Providers */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span className="aa-overline">Cuentas conectadas</span>
          <Badge variant="neutral">{portfolio!.providers.length} activas</Badge>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {portfolio!.providers.map((p, i) => (
            <ProviderRow key={p.provider} provider={p} totalUsd={portfolio!.total_usd} idx={i} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </div>
  )
}

function PageHeader({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>
          Mi Portfolio
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Vista unificada de todos tus activos</p>
      </div>
      <Button variant="secondary" size="sm" icon={<RefreshIcon />} onClick={onRefresh} disabled={loading}>
        {loading ? 'Actualizando…' : 'Actualizar'}
      </Button>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[280, 80, 80, 80].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />
      ))}
      <style>{`@keyframes aa-pulse { from { opacity: 0.5 } to { opacity: 1 } }`}</style>
    </div>
  )
}
