const COLORS: Record<string, string> = {
  binance:     '#F0B90B',
  lemon:       '#00D26A',
  iol:         '#0057B8',
  bull:        '#E84040',
  balanz:      '#6B3FA0',
  mercadopago: '#009EE3',
  evm:         '#627EEA',
  solana:      '#9945FF',
  manual:      '#8A97AB',
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

function bgColor(provider: string) {
  const color = COLORS[provider.toLowerCase()] ?? '#3D4859'
  return color + '22'
}

function fgColor(provider: string) {
  return COLORS[provider.toLowerCase()] ?? '#8A97AB'
}

interface Props {
  provider: string
  label?: string
  size?: number
}

export function ProviderMark({ provider, label, size = 36 }: Props) {
  const display = label ?? provider
  return (
    <span
      className="aa-pm"
      style={{ width: size, height: size, background: bgColor(provider), color: fgColor(provider) }}
      title={display}
    >
      {initials(display)}
    </span>
  )
}
