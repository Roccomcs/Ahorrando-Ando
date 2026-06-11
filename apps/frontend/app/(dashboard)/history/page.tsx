'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolioHistory } from '@/hooks/usePortfolio'
import { clsx } from 'clsx'

type Range = '7d' | '30d' | '90d'

const RANGES: { label: string; value: Range; days: number }[] = [
  { label: '7 días', value: '7d', days: 7 },
  { label: '30 días', value: '30d', days: 30 },
  { label: '90 días', value: '90d', days: 90 },
]

function isoFrom(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

export default function HistoryPage() {
  const [range, setRange] = useState<Range>('30d')
  const rangeConfig = RANGES.find((r) => r.value === range)!

  const { data, isLoading } = usePortfolioHistory(isoFrom(rangeConfig.days))

  const points = data?.points.map((p) => ({
    date: formatDate(p.snapshot_at),
    usd: p.total_usd,
  })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <p className="text-sm text-gray-500 mt-0.5">Evolución del valor total de tu portfolio</p>
      </div>

      {/* Selector de rango */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              range === r.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
        ) : points.length < 2 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Sin suficientes datos para mostrar el gráfico.
            <br />
            El historial se acumula con cada consulta al dashboard.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${(v as number).toLocaleString('es-AR')}`}
              />
              <Tooltip
                formatter={(value) => [
                  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD`,
                  'Portfolio',
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '13px',
                }}
              />
              <Line
                type="monotone"
                dataKey="usd"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Resumen de cambio */}
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-gray-500 mb-1">Cambio 24h</p>
            <ChangeDisplay value={data.change_pct_24h} />
          </Card>
          <Card>
            <p className="text-xs text-gray-500 mb-1">Cambio 30d</p>
            <ChangeDisplay value={data.change_pct_30d} />
          </Card>
        </div>
      )}
    </div>
  )
}

function ChangeDisplay({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-sm">Sin datos</span>
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'
  return (
    <p className={clsx('text-2xl font-bold', color)}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </p>
  )
}
