'use client'

import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAlerts, useCreateAlert, useDeleteAlert } from '@/hooks/usePortfolio'
import type { PriceAlertDTO } from '@/lib/types'

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'ADA', 'MATIC', 'DOT', 'AVAX', 'LINK', 'LTC', 'XRP', 'DOGE']

function AlertCard({ alert, onDelete }: { alert: PriceAlertDTO; onDelete: (id: string) => void }) {
  const dirText = alert.direction === 'above' ? 'sube sobre' : 'baja de'
  const statusColor = alert.triggered_at
    ? 'text-gray-400'
    : alert.is_active
    ? 'text-green-600'
    : 'text-gray-400'

  return (
    <Card className="flex items-center justify-between py-4">
      <div className="flex items-center gap-3">
        {alert.triggered_at ? (
          <CheckCircle className="h-5 w-5 text-indigo-400" />
        ) : alert.is_active ? (
          <Clock className="h-5 w-5 text-green-500" />
        ) : (
          <Bell className="h-5 w-5 text-gray-300" />
        )}
        <div>
          <p className="font-medium text-gray-800">
            <span className="font-bold">{alert.asset_symbol}</span>{' '}
            <span className="text-gray-500">{dirText}</span>{' '}
            <span className="font-bold">${alert.threshold_usd.toLocaleString()} USD</span>
          </p>
          <p className={`text-xs ${statusColor}`}>
            {alert.triggered_at
              ? `Disparada el ${new Date(alert.triggered_at).toLocaleDateString('es-AR')}`
              : alert.is_active
              ? 'Activa'
              : 'Inactiva'}
            {alert.note && ` · ${alert.note}`}
          </p>
        </div>
      </div>
      {alert.is_active && !alert.triggered_at && (
        <Button
          variant="ghost"
          onClick={() => onDelete(alert.id)}
          className="text-red-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </Card>
  )
}

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts()
  const createMutation = useCreateAlert()
  const deleteMutation = useDeleteAlert()

  const [showModal, setShowModal] = useState(false)
  const [symbol, setSymbol] = useState('BTC')
  const [threshold, setThreshold] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    setPushEnabled('Notification' in window && Notification.permission === 'granted')
  }, [])

  async function handleRequestPush() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    })
    const json = sub.toJSON()
    await fetch('/api/v1/alerts/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      }),
    })
    setPushEnabled(true)
  }

  async function handleCreate() {
    setError('')
    const val = parseFloat(threshold)
    if (isNaN(val) || val <= 0) {
      setError('Ingresá un umbral válido mayor a 0')
      return
    }
    try {
      await createMutation.mutateAsync({ asset_symbol: symbol, threshold_usd: val, direction, note: note || undefined })
      setShowModal(false)
      setThreshold('')
      setNote('')
    } catch {
      setError('Error al crear la alerta. Intentá de nuevo.')
    }
  }

  const active = alerts?.filter((a) => a.is_active && !a.triggered_at) ?? []
  const history = alerts?.filter((a) => !a.is_active || a.triggered_at) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertas de precio</h1>
          <p className="text-sm text-gray-500 mt-0.5">Te avisamos cuando un activo cruza tu umbral</p>
        </div>
        <div className="flex gap-2">
          {!pushEnabled && (
            <Button variant="secondary" onClick={handleRequestPush}>
              <Bell className="h-4 w-4" />
              Activar push
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" />
            Nueva alerta
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200" />)}
        </div>
      )}

      {!isLoading && active.length === 0 && (
        <Card className="text-center py-12">
          <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No tenés alertas activas.</p>
        </Card>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Activas</p>
          {active.map((a) => (
            <AlertCard key={a.id} alert={a} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Historial</p>
          {history.map((a) => (
            <AlertCard key={a.id} alert={a} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Nueva alerta</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activo</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SUPPORTED_SYMBOLS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
              <div className="flex gap-2">
                {(['above', 'below'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      direction === d
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {d === 'above' ? 'Sube sobre' : 'Baja de'}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Umbral (USD)"
              type="number"
              placeholder="ej: 80000"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />

            <Input
              label="Nota (opcional)"
              placeholder="ej: comprar más si llega aquí"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setShowModal(false); setError('') }}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} loading={createMutation.isPending}>
                Crear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
