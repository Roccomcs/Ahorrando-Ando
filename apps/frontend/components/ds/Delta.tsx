interface Props {
  value: number
  digits?: number
}

export function formatPct(value: number, digits = 2) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(digits).replace('.', ',')}%`
}

export function Delta({ value, digits = 2 }: Props) {
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat'
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '—'
  return (
    <span className={`aa-delta aa-delta--${dir}`}>
      <span>{arrow}</span>
      <span>{formatPct(Math.abs(value), digits)}</span>
    </span>
  )
}
