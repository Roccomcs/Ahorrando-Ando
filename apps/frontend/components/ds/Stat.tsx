import { ReactNode } from 'react'

interface Props {
  label: string
  value: string | ReactNode
  size?: 'sm' | 'md' | 'lg'
  sub?: ReactNode
}

export function formatMoney(amount: number, currency = 'US$') {
  return `${currency} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Formatea un monto en USD mostrando también su equivalente en pesos.
 * Si no hay cotización (rate null/0), cae a solo USD.
 */
export function formatMoneyDual(amountUsd: number, rate?: number | null) {
  const usd = formatMoney(amountUsd, 'US$')
  if (!rate || rate <= 0) return usd
  const ars = formatMoney(amountUsd * rate, 'AR$')
  return `${ars} · ${usd}`
}

export function Stat({ label, value, size = 'md', sub }: Props) {
  return (
    <div className="aa-stat">
      <span className="aa-stat__label">{label}</span>
      <span className={`aa-stat__value aa-stat__value--${size}`}>{value}</span>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
