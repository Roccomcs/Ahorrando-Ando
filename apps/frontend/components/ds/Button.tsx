'use client'
import { ButtonHTMLAttributes, ReactNode } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  full?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', full, icon, children, className = '', ...rest }: Props) {
  const cls = `aa-btn aa-btn--${variant} aa-btn--${size}${full ? ' aa-btn--full' : ''} ${className}`.trim()
  return (
    <button type="button" className={cls} {...rest}>
      {icon && <span style={{ display: 'inline-flex' }}>{icon}</span>}
      {children}
    </button>
  )
}
