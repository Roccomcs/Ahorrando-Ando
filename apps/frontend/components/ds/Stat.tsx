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

export function Stat({ label, value, size = 'md', sub }: Props) {
  return (
    <div className="aa-stat">
      <span className="aa-stat__label">{label}</span>
      <span className={`aa-stat__value aa-stat__value--${size}`}>{value}</span>
      {sub && <div style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}
