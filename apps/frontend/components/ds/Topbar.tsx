'use client'

import Link from 'next/link'
import { UserMenu } from '@/components/ds/UserMenu'
import { useCurrency } from '@/lib/currency-context'

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
    <header className="aa-topbar" style={{ justifyContent: 'flex-end' }}>
      {/* Toggle de moneda */}
      <div className="aa-seg" style={{ padding: 3 }} role="group" aria-label="Moneda de visualización">
        {(['USD', 'ARS'] as const).map(c => (
          <button
            key={c}
            type="button"
            aria-pressed={currency === c}
            className={`aa-seg__opt${currency === c ? ' aa-seg__opt--on' : ''}`}
            style={{ height: 30, padding: '0 12px', fontSize: 12 }}
            onClick={() => setCurrency(c)}
          >
            <span aria-hidden>{c === 'USD' ? 'US$' : 'AR$'}</span>
            <span className="aa-sr-only">{c === 'USD' ? 'Dólares' : 'Pesos argentinos'}</span>
          </button>
        ))}
      </div>

      {/* Notificaciones → Alertas */}
      <Link
        href="/alerts"
        className="aa-icon-btn aa-icon-btn--md"
        aria-label="Alertas"
        style={{ borderRadius: '50%', border: '1px solid var(--border-2)', width: 38, height: 38 }}
      >
        <BellIcon />
      </Link>

      <UserMenu />
    </header>
  )
}
