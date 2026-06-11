'use client'

import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePortfolio, useRefreshPortfolio } from '@/hooks/usePortfolio'
import { clsx } from 'clsx'

function PctBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">Sin datos</span>
  const positive = value > 0
  const zero = value === 0
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        positive && 'bg-green-50 text-green-700',
        !positive && !zero && 'bg-red-50 text-red-700',
        zero && 'bg-gray-50 text-gray-500'
      )}
    >
      {positive && <TrendingUp className="h-3 w-3" />}
      {!positive && !zero && <TrendingDown className="h-3 w-3" />}
      {zero && <Minus className="h-3 w-3" />}
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Portfolio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vista unificada de todos tus activos</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refresh.mutate()}
          loading={refresh.isPending}
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Total */}
      <Card>
        <p className="text-sm font-medium text-gray-500">Total del portfolio</p>
        <p className="mt-1 text-4xl font-bold text-gray-900">
          ${portfolio?.total_usd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="ml-1 text-base font-normal text-gray-400">USD</span>
        </p>
        <div className="mt-3 flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">24 horas</p>
            <PctBadge value={portfolio?.change_pct_24h ?? null} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">30 días</p>
            <PctBadge value={portfolio?.change_pct_30d ?? null} />
          </div>
        </div>
      </Card>

      {/* Providers */}
      {portfolio?.providers.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-sm">
            No tenés integraciones conectadas. Agregá una desde{' '}
            <a href="/integrations" className="text-indigo-600 hover:underline">Integraciones</a>.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {portfolio?.providers.map((provider) => (
          <Card key={provider.provider}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 capitalize">{provider.provider}</h2>
              <span className="text-sm font-medium text-gray-900">
                ${provider.balance_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {provider.holdings.length > 0 && (
              <div className="divide-y divide-gray-50">
                {provider.holdings.map((h) => (
                  <div key={h.asset_symbol} className="py-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{h.asset_symbol}</p>
                      <p className="text-xs text-gray-400">{h.amount.toLocaleString('es-AR', { maximumFractionDigits: 6 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-700">
                        ${h.current_value_usd.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                      <PctBadge value={h.performance_24h} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="h-40 rounded-xl bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-xl bg-gray-200" />
        ))}
      </div>
    </div>
  )
}
