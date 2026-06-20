'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { EmptyState } from '@/components/ds/EmptyState'
import { useAlerts, useCreateAlert, useDeleteAlert } from '@/hooks/usePortfolio'
import type { PriceAlertDTO } from '@/lib/types'

const SUPPORTED_SYMBOLS = ['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'SOL', 'ADA', 'MATIC', 'DOT', 'AVAX', 'LINK', 'LTC', 'XRP', 'DOGE']

function BellIcon({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>
}
function CheckIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function ClockIcon({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function TrashIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
}
function PlusIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
}

function AlertItem({ alert, onDelete }: { alert: PriceAlertDTO; onDelete: (id: string) => void }) {
  const dirText = alert.direction === 'above' ? 'sube sobre' : 'baja de'
  const triggered = !!alert.triggered_at
  const active = alert.is_active && !triggered

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)' }}>
      <div style={{ flexShrink: 0, color: triggered ? 'var(--cielo-400)' : active ? 'var(--up)' : 'var(--text-3)' }}>
        {triggered ? <CheckIcon /> : active ? <ClockIcon /> : <BellIcon size={18} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-1)' }}>
          <span className="aa-num" style={{ fontWeight: 'var(--weight-bold)' }}>{alert.asset_symbol}</span>
          {' '}<span style={{ color: 'var(--text-2)' }}>{dirText}</span>{' '}
          <span className="aa-num" style={{ fontWeight: 'var(--weight-bold)' }}>${alert.threshold_usd.toLocaleString()}</span> USD
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          {triggered ? `Disparada el ${new Date(alert.triggered_at!).toLocaleDateString('es-AR')}` : active ? 'Activa' : 'Inactiva'}
          {alert.note && ` · ${alert.note}`}
        </p>
      </div>
      {active && (
        <button onClick={() => onDelete(alert.id)}
          style={{ flexShrink: 0, padding: 6, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--down)', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--down-bg)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

const segStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', border: '1px solid', cursor: 'pointer', flex: 1, textAlign: 'center',
  background: active ? 'var(--surface-inset)' : 'transparent',
  borderColor: active ? 'var(--border-2)' : 'var(--border-1)',
  color: active ? 'var(--text-1)' : 'var(--text-2)',
})

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
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey })
    const json = sub.toJSON()
    await fetch('/api/v1/alerts/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
    })
    setPushEnabled(true)
  }

  async function handleCreate() {
    setError('')
    const val = parseFloat(threshold)
    if (isNaN(val) || val <= 0) { setError('Ingresá un umbral válido mayor a 0'); return }
    try {
      await createMutation.mutateAsync({ asset_symbol: symbol, threshold_usd: val, direction, note: note || undefined })
      setShowModal(false); setThreshold(''); setNote('')
    } catch {
      setError('Error al crear la alerta. Intentá de nuevo.')
    }
  }

  const active = alerts?.filter(a => a.is_active && !a.triggered_at) ?? []
  const history = alerts?.filter(a => !a.is_active || a.triggered_at) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Alertas de precio</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Te avisamos cuando un activo cruza tu umbral</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!pushEnabled && <Button variant="secondary" size="sm" icon={<BellIcon size={14} />} onClick={handleRequestPush}>Activar push</Button>}
          <Button size="sm" icon={<PlusIcon />} onClick={() => setShowModal(true)}>Nueva alerta</Button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />)}
        </div>
      )}

      {!isLoading && active.length === 0 && history.length === 0 && (
        <Card padding="lg">
          <EmptyState icon={<BellIcon size={32} />} title="Sin alertas activas" body="Creá tu primera alerta para recibir notificaciones de precio." />
        </Card>
      )}

      {active.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="aa-overline">Activas</span>
          {active.map(a => <AlertItem key={a.id} alert={a} onDelete={id => deleteMutation.mutate(id)} />)}
        </div>
      )}

      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="aa-overline">Historial</span>
          {history.map(a => <AlertItem key={a.id} alert={a} onDelete={id => deleteMutation.mutate(id)} />)}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <Card padding="lg" raised style={{ width: '100%', maxWidth: 380 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 16px' }}>Nueva alerta</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Activo</label>
                <select value={symbol} onChange={e => setSymbol(e.target.value)} className="aa-select" style={{ width: '100%' }}>
                  {SUPPORTED_SYMBOLS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>Condición</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['above', 'below'] as const).map(d => (
                    <button key={d} onClick={() => setDirection(d)} style={segStyle(direction === d)}>
                      {d === 'above' ? 'Sube sobre' : 'Baja de'}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Umbral (USD)" type="number" placeholder="ej: 80000" value={threshold} onChange={e => setThreshold(e.target.value)} />
              <Input label="Nota (opcional)" placeholder="ej: comprar más si llega aquí" value={note} onChange={e => setNote(e.target.value)} />
              {error && <div style={{ background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => { setShowModal(false); setError('') }}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creando…' : 'Crear'}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
