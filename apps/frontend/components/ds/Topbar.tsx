'use client'

import { UserMenu } from '@/components/ds/UserMenu'
import { useCurrency } from '@/lib/currency-context'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

export function Topbar() {
  const { currency, setCurrency } = useCurrency()

  return (
    <header
      style={{
        height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 24px',
        borderBottom: '1px solid var(--border-1)',
        background: 'var(--surface-canvas)',
      }}
    >
      {/* Buscador */}
      <div style={{ flex: 1, maxWidth: 520, position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', left: 14, color: 'var(--text-3)', display: 'flex' }}><SearchIcon /></span>
        <input
          className="aa-topsearch"
          placeholder="Buscar activos, cuentas, movimientos…"
          style={{
            width: '100%', height: 40, borderRadius: 'var(--radius-full)',
            background: 'var(--surface-2)', border: '1px solid var(--border-1)',
            color: 'var(--text-1)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)',
            padding: '0 44px 0 40px', outline: 'none',
          }}
        />
        <kbd
          style={{
            position: 'absolute', right: 10, fontSize: 11, color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)', background: 'var(--surface-1)',
            border: '1px solid var(--border-1)', borderRadius: 6, padding: '2px 6px',
          }}
        >⌘K</kbd>
      </div>

      <div style={{ flex: 1 }} />

      {/* Toggle de moneda */}
      <div className="aa-seg" style={{ padding: 3 }}>
        {(['USD', 'ARS'] as const).map(c => (
          <button
            key={c}
            className={`aa-seg__opt${currency === c ? ' aa-seg__opt--on' : ''}`}
            style={{ height: 30, padding: '0 12px', fontSize: 12 }}
            onClick={() => setCurrency(c)}
          >
            {c === 'USD' ? 'US$' : 'AR$'}
          </button>
        ))}
      </div>

      {/* Notificaciones */}
      <button
        className="aa-icon-btn aa-icon-btn--md"
        aria-label="Notificaciones"
        style={{ borderRadius: '50%', border: '1px solid var(--border-2)', width: 38, height: 38 }}
      >
        <BellIcon />
      </button>

      <UserMenu />
    </header>
  )
}
