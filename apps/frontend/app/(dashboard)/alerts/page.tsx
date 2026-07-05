'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ds/Button'
import { useAlerts, useCreateAlert, useDeleteAlert, useToggleAlert, usePortfolio } from '@/hooks/usePortfolio'
import type { PriceAlertDTO } from '@/lib/types'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }

function TrashIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}

function fmtUsd(v: number) {
  return `US$ ${v.toLocaleString('es-AR', { minimumFractionDigits: v < 100 ? 2 : 0, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
}

function SymbolBadge({ symbol }: { symbol: string }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: 'var(--surface-2)', border: '1px solid var(--border-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-1)',
    }}>{symbol.slice(0, 4)}</div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 44, height: 26, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: on ? 'var(--primary)' : 'var(--surface-3)',
        position: 'relative', transition: 'background var(--dur-fast) var(--ease-out)',
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left var(--dur-fast) var(--ease-out)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }} />
    </button>
  )
}

function AlertRow({ alert, onToggle, onDelete }: {
  alert: PriceAlertDTO
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
}) {
  const dirText = alert.direction === 'above' ? 'sube por encima de' : 'baja por debajo de'
  const triggeredToday = alert.triggered_at && new Date(alert.triggered_at).toDateString() === new Date().toDateString()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 0', borderBottom: '1px solid var(--border-1)' }}>
      <SymbolBadge symbol={alert.asset_symbol} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {alert.asset_symbol} {dirText} <span style={MONO}>{fmtUsd(alert.threshold_usd)}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          Creada el {fmtDate(alert.created_at)}{alert.note ? ` · ${alert.note}` : ''}{!alert.is_active && !alert.triggered_at ? ' · pausada' : ''}
        </div>
      </div>
      {triggeredToday && (
        <span style={{
          padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          border: '1px solid color-mix(in srgb, var(--warning) 55%, transparent)', color: 'var(--warning)',
        }}>disparada hoy</span>
      )}
      <Switch on={alert.is_active} onChange={v => onToggle(alert.id, v)} />
      <button onClick={() => onDelete(alert.id)} aria-label="Eliminar alerta"
        style={{ padding: 6, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
        <TrashIcon />
      </button>
    </div>
  )
}

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts()
  const { data: portfolio } = usePortfolio()
  const createMutation = useCreateAlert()
  const deleteMutation = useDeleteAlert()
  const toggleMutation = useToggleAlert()

  const [showModal, setShowModal] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [customSymbol, setCustomSymbol] = useState('')
  const [threshold, setThreshold] = useState('')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [error, setError] = useState('')

  // Chips de activos reales del portfolio + precio actual para referencia.
  const holdings = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of portfolio?.providers ?? []) {
      for (const h of p.holdings) {
        if (h.amount > 0 && h.current_value_usd > 0) map.set(h.asset_symbol, h.current_value_usd / h.amount)
      }
    }
    return map
  }, [portfolio])
  const chipSymbols = useMemo(() => [...holdings.keys()].slice(0, 8), [holdings])

  const effectiveSymbol = (symbol || customSymbol).trim().toUpperCase()
  const currentPrice = holdings.get(effectiveSymbol)

  async function handleCreate() {
    setError('')
    if (!effectiveSymbol) { setError('Elegí o escribí un activo'); return }
    const val = parseFloat(threshold.replace(/\./g, '').replace(',', '.'))
    if (isNaN(val) || val <= 0) { setError('Ingresá un umbral válido mayor a 0'); return }
    try {
      await createMutation.mutateAsync({ asset_symbol: effectiveSymbol, threshold_usd: val, direction })
      setShowModal(false); setThreshold(''); setSymbol(''); setCustomSymbol('')
    } catch {
      setError('Error al crear la alerta. Intentá de nuevo.')
    }
  }

  const list = alerts ?? []
  const activeCount = list.filter(a => a.is_active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div className="aa-sec aa-sec--1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Alertas</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-1)', margin: '6px 0 6px' }}>
            Que el mercado te busque a vos
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Te avisamos cuando un activo cruza tu umbral.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>+ Nueva alerta</Button>
      </div>

      {/* Lista */}
      <section className="aa-sec aa-sec--2">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
          Tus alertas{activeCount > 0 ? ` · ${activeCount} activa${activeCount !== 1 ? 's' : ''}` : ''}
        </span>

        {isLoading && [0, 1].map(i => <div key={i} className="aa-skel" style={{ height: 64, marginTop: 10 }} />)}

        {!isLoading && list.length === 0 && (
          <div style={{ padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
            Sin alertas todavía. Creá la primera para que te avisemos cuando un precio cruce tu umbral.
          </div>
        )}

        {list.map(a => (
          <AlertRow key={a.id} alert={a}
            onToggle={(id, active) => toggleMutation.mutate({ id, is_active: active })}
            onDelete={id => deleteMutation.mutate(id)} />
        ))}
      </section>

      {/* Modal Nueva alerta */}
      {showModal && (
        <div className="aa-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="aa-dialog" style={{ maxWidth: 440 }}>
            <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>Nueva alerta</h2>
              <button onClick={() => setShowModal(false)} aria-label="Cerrar"
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border-2)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15 }}>✕</button>
            </div>
            <div style={{ padding: '18px 26px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Activo */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Activo</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {chipSymbols.map(s => {
                    const on = symbol === s
                    return (
                      <button key={s} onClick={() => { setSymbol(on ? '' : s); setCustomSymbol('') }}
                        style={{
                          padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                          background: 'transparent', border: `1px solid ${on ? 'var(--primary)' : 'var(--border-2)'}`,
                          color: on ? 'var(--primary)' : 'var(--text-2)',
                        }}>{s}</button>
                    )
                  })}
                  <input value={customSymbol} placeholder="Otro…"
                    onChange={e => { setCustomSymbol(e.target.value.toUpperCase()); setSymbol('') }}
                    style={{ width: 90, padding: '6px 12px', borderRadius: 999, background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-1)', fontFamily: 'var(--font-mono)', fontSize: 12, outline: 'none' }} />
                </div>
              </div>
              {/* Condición */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Condición</span>
                <div className="aa-seg" style={{ width: '100%' }}>
                  {(['above', 'below'] as const).map(d => (
                    <button key={d} className={`aa-seg__opt${direction === d ? ' aa-seg__opt--on' : ''}`} style={{ flex: 1 }} onClick={() => setDirection(d)}>
                      {d === 'above' ? 'Sube por encima de' : 'Baja por debajo de'}
                    </button>
                  ))}
                </div>
              </div>
              {/* Umbral */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 8 }}>Umbral</span>
                <input className="aa-input aa-input--mono" placeholder="110.000" value={threshold} onChange={e => setThreshold(e.target.value)} />
                {currentPrice && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                    Precio actual de {effectiveSymbol}: <span style={{ ...MONO, color: 'var(--text-1)', fontWeight: 700 }}>{fmtUsd(currentPrice)}</span>
                  </div>
                )}
              </div>
              {error && <div style={{ border: '1px solid rgba(255,77,109,0.3)', background: 'rgba(255,77,109,0.06)', borderRadius: 'var(--radius-md)', padding: '9px 13px', fontSize: 13, color: 'var(--negative)' }}>{error}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>Cancelar</button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando…' : 'Crear alerta'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
