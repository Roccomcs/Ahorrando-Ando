'use client'

import { useState } from 'react'
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAllocation, useROI, useBenchmark } from '@/hooks/usePortfolio'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
]

type AllocationView = 'by_asset' | 'by_provider' | 'by_type'
const VIEW_LABELS: Record<AllocationView, string> = {
  by_asset: 'Por activo',
  by_provider: 'Por broker',
  by_type: 'Por tipo',
}

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-sm">—</span>
  const color = value > 0 ? 'text-green-600' : value < 0 ? 'text-red-500' : 'text-gray-500'
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

function AllocationSection() {
  const { data, isLoading } = useAllocation()
  const [view, setView] = useState<AllocationView>('by_asset')

  if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />
  if (!data || data.total_usd === 0) return (
    <Card className="text-center py-8 text-gray-400 text-sm">Sin datos de portfolio todavía.</Card>
  )

  const items = data[view].slice(0, 8)

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Distribución del portfolio</h2>
        <div className="flex gap-1">
          {(Object.keys(VIEW_LABELS) as AllocationView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                view === v ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={items}
              dataKey="usd_value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={90}
              strokeWidth={1}
            >
              {items.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`$${Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`, 'USD']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="w-full md:w-64 space-y-2 shrink-0">
          {items.map((item, i) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-700 font-medium">{item.label}</span>
              </div>
              <span className="text-gray-500">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ROISection() {
  const { data, isLoading } = useROI()

  if (isLoading) return <div className="h-40 animate-pulse bg-gray-100 rounded-xl" />
  if (!data || data.length === 0) return null

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold text-gray-900">Rendimiento por activo</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="pb-2 pr-4">Activo</th>
              <th className="pb-2 pr-4">Broker</th>
              <th className="pb-2 pr-4 text-right">Valor USD</th>
              <th className="pb-2 pr-4 text-right">24h</th>
              <th className="pb-2 text-right">30d</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2.5 pr-4">
                  <span className="font-semibold text-gray-800">{item.asset_symbol}</span>
                  <span className="text-gray-400 ml-1.5 text-xs">{item.asset_name}</span>
                </td>
                <td className="py-2.5 pr-4 text-gray-500 capitalize">{item.provider}</td>
                <td className="py-2.5 pr-4 text-right font-medium text-gray-800">
                  ${item.current_value_usd.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 pr-4 text-right"><PctBadge value={item.performance_24h} /></td>
                <td className="py-2.5 text-right"><PctBadge value={item.performance_30d} /></td>
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
    <Card className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold text-gray-900">Benchmarking</h2>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {['BTC', 'ETH'].map((a) => (
              <button
                key={a}
                onClick={() => setAsset(a)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  asset === a ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            {['7d', '30d', '90d'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />}

      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-400 mb-1">Tu portfolio ({period})</p>
            <PctBadge value={data.portfolio_change_pct} />
            {data.snapshot_count < 2 && (
              <p className="text-xs text-gray-400 mt-1">Necesitás más historial</p>
            )}
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-xs text-gray-400 mb-1">{data.benchmark_asset} ({period})</p>
            <PctBadge value={data.asset_change_pct} />
          </div>
          {data.portfolio_change_pct !== null && data.asset_change_pct !== null && (
            <div className="col-span-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700 font-medium">
              {data.outperformed
                ? `📈 Tu portfolio superó a ${data.benchmark_asset} por ${(data.portfolio_change_pct - data.asset_change_pct).toFixed(2)}pp`
                : `📉 ${data.benchmark_asset} te ganó por ${(data.asset_change_pct - data.portfolio_change_pct).toFixed(2)}pp`}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsPage() {
  function handleExport() {
    window.open('/api/v1/dashboard/export?days=365', '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análisis detallado de tu portfolio</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <AllocationSection />
      <ROISection />
      <BenchmarkSection />
    </div>
  )
}
