'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  Plus, Zap, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolio, useRefreshPortfolio } from '@/hooks/usePortfolio'
import { clsx } from 'clsx'
import type { PortfolioSummaryDTO, ProviderSummaryDTO } from '@/lib/types'

// ── Colores por provider ───────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  binance:    '#f59e0b',
  mercadopago:'#3b82f6',
  bullmarket: '#10b981',
  lemoncash:  '#22c55e',
  iol:        '#6366f1',
  onchain:    '#8b5cf6',
  solana:     '#a855f7',
  balanz_csv: '#ec4899',
  manual:     '#64748b',
}
const FALLBACK_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']

function providerColor(name: string, idx: number) {
  return PROVIDER_COLORS[name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length]
}

function providerLabel(name: string) {
  const labels: Record<string, string> = {
    binance: 'Binance',
    mercadopago: 'MercadoPago',
    bullmarket: 'BullMarket',
    lemoncash: 'Lemon Cash',
    iol: 'InvertirOnline',
    onchain: 'Wallet EVM',
    solana: 'Wallet Solana',
    balanz_csv: 'Balanz',
    manual: 'Manual',
  }
  return labels[name] ?? name
}

// ── Badge de rendimiento ───────────────────────────────────────────────────────
function PctBadge({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'xs' }) {
  if (value === null) return <span className="text-gray-300 text-xs">—</span>
  const pos = value > 0
  const zero = value === 0
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 font-medium',
      size === 'sm' ? 'text-sm' : 'text-xs',
      pos && 'text-green-600',
      !pos && !zero && 'text-red-500',
      zero && 'text-gray-400',
    )}>
      {pos && <TrendingUp className="h-3 w-3" />}
      {!pos && !zero && <TrendingDown className="h-3 w-3" />}
      {zero && <Minus className="h-3 w-3" />}
      {pos ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

// ── Donut chart con total en el centro ────────────────────────────────────────
function PortfolioDonut({ portfolio }: { portfolio: PortfolioSummaryDTO }) {
  const data = portfolio.providers.map((p, i) => ({
    name: providerLabel(p.provider),
    value: p.balance_usd,
    color: providerColor(p.provider, i),
  }))

  if (data.length === 0) return null

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={85}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                'USD',
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Total en el centro del donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-gray-400 leading-none">Total</p>
          <p className="text-base font-bold text-gray-900 leading-tight">
            ${portfolio.total_usd >= 1000
              ? (portfolio.total_usd / 1000).toFixed(1) + 'k'
              : portfolio.total_usd.toFixed(0)}
          </p>
          <p className="text-[10px] text-gray-400 leading-none">USD</p>
        </div>
      </div>

      {/* Leyenda compacta */}
      <div className="mt-3 space-y-1.5 w-full max-w-[160px]">
        {data.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 truncate">{entry.name}</span>
            </div>
            <span className="text-gray-400 ml-2 shrink-0">
              {portfolio.total_usd > 0
                ? ((entry.value / portfolio.total_usd) * 100).toFixed(0) + '%'
                : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Fila de provider expandible ───────────────────────────────────────────────
function ProviderRow({
  provider,
  totalUsd,
  idx,
  defaultOpen,
}: {
  provider: ProviderSummaryDTO
  totalUsd: number
  idx: number
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const pct = totalUsd > 0 ? (provider.balance_usd / totalUsd) * 100 : 0
  const color = providerColor(provider.provider, idx)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header clickeable */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Ícono de color */}
        <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: color }}>
          {providerLabel(provider.provider).charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">
              {providerLabel(provider.provider)}
            </p>
            <p className="text-sm font-bold text-gray-900 ml-2 shrink-0">
              ${provider.balance_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {/* Barra de proporción */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs text-gray-400 shrink-0 w-8 text-right">
              {pct.toFixed(0)}%
            </span>
          </div>
        </div>

        {open
          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {/* Holdings expandidos */}
      {open && provider.holdings.length > 0 && (
        <div className="border-t border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
          {provider.holdings.map((h) => (
            <div key={h.asset_symbol} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                  {h.asset_symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{h.asset_symbol}</p>
                  <p className="text-xs text-gray-400">
                    {h.amount.toLocaleString('es-AR', { maximumFractionDigits: 6 })}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-700 font-medium">
                  ${h.current_value_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <PctBadge value={h.performance_24h} size="xs" />
              </div>
            </div>
          ))}
        </div>
      )}

      {open && provider.holdings.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
          <p className="text-xs text-gray-400">Sin activos individuales disponibles para este provider.</p>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: portfolio, isLoading, error } = usePortfolio()
  const refresh = useRefreshPortfolio()

  if (isLoading) return <DashboardSkeleton />

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-red-700">
        Error al cargar el portfolio. ¿Está corriendo el backend?
      </div>
    )
  }

  // Onboarding
  if (portfolio?.providers.length === 0) {
    return (
      <div className="space-y-6">
        <Header refresh={() => refresh.mutate()} loading={refresh.isPending} />
        <Card className="py-14 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <Zap className="h-8 w-8 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-lg">Bienvenido a Ahorrando Ando</p>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                Conectá tu primera cuenta financiera para ver tus activos unificados acá.
              </p>
            </div>
            <Link href="/integrations">
              <Button>
                <Plus className="h-4 w-4" />
                Conectar primera cuenta
              </Button>
            </Link>
            <p className="text-xs text-gray-400">
              Binance · MercadoPago · Lemon Cash · IOL · BullMarket · Wallets · y más
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Header refresh={() => refresh.mutate()} loading={refresh.isPending} />

      {/* ── Hero card: total + donut ────────────────────────────────────────── */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start justify-between">
          {/* Izquierda: número total + cambios */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-sm font-medium text-gray-400 mb-1">Total del portfolio</p>
            <p className="text-5xl font-bold text-gray-900 tracking-tight">
              ${portfolio!.total_usd.toLocaleString('es-AR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-base text-gray-400 mt-0.5">USD</p>

            <div className="mt-5 flex items-center gap-6 justify-center sm:justify-start">
              <div>
                <p className="text-xs text-gray-400 mb-1">Últimas 24 h</p>
                <PctBadge value={portfolio!.change_pct_24h} />
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Últimos 30 d</p>
                <PctBadge value={portfolio!.change_pct_30d} />
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div>
                <p className="text-xs text-gray-400 mb-1">Providers</p>
                <p className="text-sm font-semibold text-gray-800">{portfolio!.providers.length}</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="mt-6 flex gap-2 flex-wrap justify-center sm:justify-start">
              <Link href="/history">
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Ver historial →
                </button>
              </Link>
              <Link href="/analytics">
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Analytics →
                </button>
              </Link>
              <Link href="/integrations">
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  + Agregar cuenta
                </button>
              </Link>
            </div>
          </div>

          {/* Derecha: donut */}
          <div className="shrink-0">
            <PortfolioDonut portfolio={portfolio!} />
          </div>
        </div>
      </Card>

      {/* ── Lista de providers ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Cuentas conectadas
          </h2>
          <p className="text-xs text-gray-400">{portfolio!.providers.length} activas</p>
        </div>
        <div className="space-y-2">
          {portfolio!.providers.map((provider, idx) => (
            <ProviderRow
              key={provider.provider}
              provider={provider}
              totalUsd={portfolio!.total_usd}
              idx={idx}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Header({ refresh, loading }: { refresh: () => void; loading: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Portfolio</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vista unificada de todos tus activos</p>
      </div>
      <Button variant="secondary" onClick={refresh} loading={loading}>
        <RefreshCw className="h-4 w-4" />
        Actualizar
      </Button>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="h-64 rounded-2xl bg-gray-200" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200" />)}
      </div>
    </div>
  )
}
