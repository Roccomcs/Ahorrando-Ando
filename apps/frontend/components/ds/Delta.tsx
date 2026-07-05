interface Props {
  value: number
  digits?: number
  size?: 'sm' | 'md'
  /** Se mantiene por compatibilidad; el diseño usa siempre texto plano. */
  variant?: 'soft' | 'bare'
}

export function formatPct(value: number, digits = 2) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toFixed(digits).replace('.', ',')}%`
}

/**
 * Delta — % de rendimiento. Diseño Claude Design: texto plano coloreado, sin
 * pastilla ni flecha. Positivo → emerald, negativo → rojo, cero → neutro.
 */
export function Delta({ value, digits = 2, size = 'sm' }: Props) {
  const color = value > 0 ? 'var(--positive)' : value < 0 ? 'var(--negative)' : 'var(--text-tertiary)'
  const fs = size === 'md' ? 15 : 13
  return (
    <span
      style={{
        color,
        font: `600 ${fs}px/1 var(--font-mono)`,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {formatPct(value, digits)}
    </span>
  )
}
