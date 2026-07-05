'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTransactions } from '@/hooks/usePortfolio'
import { Button } from '@/components/ds/Button'
import type { TransactionDTO, TransactionType } from '@/lib/types'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }

const TABS: { label: string; value: TransactionType | null }[] = [
  { label: 'Todos', value: null },
  { label: 'Compras', value: 'buy' },
  { label: 'Ventas', value: 'sell' },
  { label: 'Depósitos', value: 'deposit' },
  { label: 'Rendimientos', value: 'yield' },
]

const TYPE_META: Record<TransactionType, { label: string; color: string }> = {
  buy: { label: 'Compra', color: 'var(--primary)' },
  sell: { label: 'Venta', color: 'var(--warning)' },
  deposit: { label: 'Depósito', color: '#45D4C8' },
  withdrawal: { label: 'Retiro', color: 'var(--negative)' },
  yield: { label: 'Rendimiento', color: 'var(--positive)' },
}

function fmtMoney(v: number) {
  return `US$ ${Math.abs(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtQty(v: number) {
  return v.toLocaleString('es-AR', { maximumFractionDigits: 6 })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '')
}

function detail(t: TransactionDTO) {
  if (t.note) return t.note
  if (t.asset_symbol && t.quantity && t.price_usd) {
    return `${t.asset_symbol} · ${fmtQty(t.quantity)} @ ${fmtMoney(t.price_usd)}`
  }
  if (t.tx_type === 'deposit') return t.asset_symbol ? `Depósito de ${t.asset_symbol}` : 'Depósito'
  if (t.tx_type === 'withdrawal') return t.asset_symbol ? `Retiro de ${t.asset_symbol}` : 'Retiro'
  if (t.tx_type === 'yield') return 'Rendimiento'
  return t.asset_symbol ?? '—'
}

function TypeBadge({ type }: { type: TransactionType }) {
  const meta = TYPE_META[type]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '3px 12px',
      borderRadius: 999, border: `1px solid color-mix(in srgb, ${meta.color} 55%, transparent)`,
      color: meta.color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{meta.label}</span>
  )
}

function exportCsv(rows: TransactionDTO[]) {
  const head = 'fecha,tipo,detalle,cuenta,monto_usd'
  const body = rows.map(t => [
    new Date(t.occurred_at).toISOString().slice(0, 10),
    TYPE_META[t.tx_type].label,
    `"${detail(t).replace(/"/g, '""')}"`,
    `"${t.account.replace(/"/g, '""')}"`,
    t.amount_usd.toFixed(2),
  ].join(',')).join('\n')
  const blob = new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'movimientos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const [tab, setTab] = useState<TransactionType | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const { data, isLoading } = useTransactions(30)

  const all = useMemo(() => data ?? [], [data])
  const accounts = useMemo(() => [...new Set(all.map(t => t.account))], [all])
  const rows = all.filter(t =>
    (tab === null || t.tx_type === tab) && (account === null || t.account === account)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="aa-sec aa-sec--1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Historial</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-1)', margin: '6px 0 6px' }}>
          Cada movimiento, a la vista
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Compras, ventas, depósitos y rendimientos de todas tus cuentas.</p>
      </div>

      {/* Filtros */}
      <div className="aa-sec aa-sec--2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="aa-seg">
          {TABS.map(t => (
            <button key={t.label} className={`aa-seg__opt${tab === t.value ? ' aa-seg__opt--on' : ''}`} onClick={() => setTab(t.value)}>{t.label}</button>
          ))}
        </div>
        {accounts.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[null, ...accounts].map(a => {
              const on = account === a
              return (
                <button key={a ?? '__all'} onClick={() => setAccount(a)}
                  style={{
                    padding: '6px 14px', borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font-ui)', background: 'transparent',
                    border: `1px solid ${on ? 'var(--primary)' : 'var(--border-2)'}`,
                    color: on ? 'var(--primary)' : 'var(--text-2)',
                    transition: 'all var(--dur-fast) var(--ease-out)',
                  }}>
                  {a ?? 'Todas las cuentas'}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabla */}
      <section className="aa-sec aa-sec--3">
        <div style={{ display: 'grid', gridTemplateColumns: '80px 130px 1fr 180px 140px', gap: 8, padding: '0 4px 10px', borderBottom: '1px solid var(--border-1)' }}>
          {['Fecha', 'Tipo', 'Detalle', 'Cuenta', 'Monto'].map((h, i) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: i === 4 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>

        {isLoading && [0, 1, 2, 3, 4].map(i => <div key={i} className="aa-skel" style={{ height: 46, marginTop: 8 }} />)}

        {!isLoading && rows.length === 0 && (
          <div style={{ padding: '36px 4px', color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6 }}>
            Sin movimientos en los últimos 30 días.<br />
            Los movimientos se registran al cargar o editar posiciones manuales, y con los rendimientos de tus cuentas.{' '}
            <Link href="/integrations" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>Ir a Integraciones →</Link>
          </div>
        )}

        {rows.map(t => {
          const positive = t.amount_usd >= 0
          return (
            <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '80px 130px 1fr 180px 140px', gap: 8, alignItems: 'center', padding: '13px 4px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ ...MONO, fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(t.occurred_at)}</span>
              <span><TypeBadge type={t.tx_type} /></span>
              <span style={{ fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail(t)}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.account}</span>
              <span style={{ ...MONO, fontSize: 13, fontWeight: 700, textAlign: 'right', color: positive ? 'var(--positive)' : 'var(--text-1)' }}>
                {positive ? '+' : '−'}{fmtMoney(t.amount_usd)}
              </span>
            </div>
          )
        })}

        {!isLoading && rows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 18 }}>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--text-3)' }}>
              {rows.length} movimiento{rows.length !== 1 ? 's' : ''} · últimos 30 días
            </span>
            <Button variant="secondary" size="sm" onClick={() => exportCsv(rows)}>Exportar CSV</Button>
          </div>
        )}
      </section>
    </div>
  )
}
