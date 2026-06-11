'use client'

import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus, BarChart2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { useProviderPerformance } from '@/hooks/usePortfolio'
import { clsx } from 'clsx'
import type { ProviderPerformanceItem } from '@/lib/types'

// ── Paleta de colores (sincronizada con el dashboard) ─────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  binance:     '#f59e0b',
  mercadopago: '#3b82f6',
  bullmarket:  '#10b981',
  lemoncash:   '#22c55e',
  iol:         '#6366f1',
  onchain:     '#8b5cf6',
  solana:      '#a855f7',
  balanz_csv:  '#ec4899',
  manual:      '#64748b',
}
const FALLBACK = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function color(name: string, idx: number) {
  return PROVIDER_COLORS[name] ?? FALLBACK[idx % FALLBACK.length]
}

// ── Períodos disponibles ──────────────────────────────────────────────────────
const PERIODS = [
  { label: '7 días',  days: 7  },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
  { label: '1 año',   days: 365 },
]

// ── Badge de rendimiento ──────────────────────────────────────────────────────
function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-300 text-sm">—</span>
  const pos = value > 0
  const zero = value === 0
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-sm font-semibold',
      pos && 'text-green-600',
      !pos && !zero && 'text-red-500',
      zero && 'text-gray-400',
    )}>
      {pos && <TrendingUp className="h-3.5 w-3.5" />}
      {!pos && !zero && <TrendingDown className="h-3.5 w-3.5" />}
      {zero && <Minus className="h-3.5 w-3.5" />}
      {pos ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

// ── Tabla de resumen ──────────────────────────────────────────────────────────
function SummaryTable({ providers }: { providers: ProviderPerformanceItem[] }) {
  return (
    <Card>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumen por provider</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left pb-3 text-gray-400 font-medium">Provider</th>
              <th className="text-right pb-3 text-gray-400 font-medium">Actual</th>
              <th className="text-right pb-3 text-gray-400 font-medium">24 h</th>
              <th className="text-right pb-3 text-gray-400 font-medium">7 d</th>
              <th className="text-right pb-3 text-gray-400 font-medium">30 d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {providers.map((p, i) => (
              <tr key={p.provider} className="hover:bg-gray-50/50 transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: color(p.provider, i) }}
                    />
                    <span className="font-medium text-gray-800">{p.label}</span>
                  </div>
                </td>
                <td className="py-3 text-right font-semibold text-gray-900">
                  ${p.current_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 text-right"><PctBadge value={p.change_pct_24h} /></td>
                <td className="py-3 text-right"><PctBadge value={p.change_pct_7d} /></td>
                <td className="py-3 text-right"><PctBadge value={p.change_pct_30d} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ── Gráfico de líneas (evolución en el tiempo) ────────────────────────────────
function EvolutionChart({
  providers,
  days,
}: {
  providers: ProviderPerformanceItem[]
  days: number
}) {
  // Providers con al menos 2 puntos de historia
  const withHistory = providers.filter((p) => p.history.length >= 2)

  if (withHistory.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <BarChart2 className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-400">
            Todavía no hay suficientes datos históricos para este período.
            <br />
            Los gráficos aparecerán a medida que el dashboard se consulte en los próximos días.
          </p>
        </div>
      </Card>
    )
  }

  // Construir dataset: unión de todas las fechas
  const allDates = Array.from(
    new Set(withHistory.flatMap((p) => p.history.map((h) => h.date)))
  ).sort()

  const chartData = allDates.map((date) => {
    const point: Record<string, unknown> = { date: _shortDate(date, days) }
    withHistory.forEach((p) => {
      const match = p.history.find((h) => h.date === date)
      if (match) point[p.provider] = match.balance_usd
    })
    return point
  })

  return (
    <Card>
      <h2 className="text-sm font-semibold text-gray-700 mb-6">Evolución del balance</h2>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            width={48}
          />
          <Tooltip
            formatter={(value, name) => {
              const p = providers.find((x) => x.provider === name)
              return [
                `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                p?.label ?? String(name),
              ]
            }}
            contentStyle={{ borderRadius: '8px', fontSize: '12px', border: '1px solid #e5e7eb' }}
          />
          <Legend
            formatter={(value) => {
              const p = providers.find((x) => x.provider === value)
              return p?.label ?? value
            }}
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />
          {withHistory.map((p, i) => (
            <Line
              key={p.provider}
              type="monotone"
              dataKey={p.provider}
              stroke={color(p.provider, i)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Gráficos individuales por provider ────────────────────────────────────────
function ProviderCard({
  provider,
  idx,
}: {
  provider: ProviderPerformanceItem
  idx: number
}) {
  const c = color(provider.provider, idx)
  const hasHistory = provider.history.length >= 2

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: c }}
          >
            {provider.label.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{provider.label}</p>
            <p className="text-xs text-gray-400">
              ${provider.current_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center gap-2 justify-end text-xs text-gray-400">
            <span>24h</span>
            <PctBadge value={provider.change_pct_24h} />
          </div>
          <div className="flex items-center gap-2 justify-end text-xs text-gray-400">
            <span>30d</span>
            <PctBadge value={provider.change_pct_30d} />
          </div>
        </div>
      </div>

      {hasHistory ? (
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={provider.history}>
            <Line
              type="monotone"
              dataKey="balance_usd"
              stroke={c}
              strokeWidth={2}
              dot={false}
            />
            <Tooltip
              formatter={(v) => [
                `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
                'USD',
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e5e7eb' }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[100px] flex items-center justify-center">
          <p className="text-xs text-gray-300">Sin datos históricos aún</p>
        </div>
      )}
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useProviderPerformance(days)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendimiento</h1>
          <p className="text-sm text-gray-500 mt-0.5">Evolución de cada cuenta en el tiempo</p>
        </div>
        {/* Selector de período */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                days === p.days
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <PerformanceSkeleton />
      ) : !data || data.providers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <BarChart2 className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-400">
              No hay datos de performance disponibles.
              <br />
              Asegurate de tener cuentas conectadas en Integraciones.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Tabla de resumen */}
          <SummaryTable providers={data.providers} />

          {/* Gráfico comparativo */}
          <EvolutionChart providers={data.providers} days={days} />

          {/* Cards individuales */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Por cuenta
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.providers.map((p, i) => (
                <ProviderCard key={p.provider} provider={p} idx={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-40 rounded-2xl bg-gray-200" />
      <div className="h-80 rounded-2xl bg-gray-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-gray-200" />)}
      </div>
    </div>
  )
}

function _shortDate(iso: string, days: number): string {
  const d = new Date(iso)
  if (days <= 30) return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
}
