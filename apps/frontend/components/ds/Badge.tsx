import { ReactNode } from 'react'

interface Props {
  variant?: 'neutral' | 'up' | 'down' | 'warn' | 'accent'
  children: ReactNode
}

export function Badge({ variant = 'neutral', children }: Props) {
  return <span className={`aa-badge aa-badge--${variant}`}>{children}</span>
}
