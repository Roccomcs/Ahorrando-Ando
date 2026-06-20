import { HTMLAttributes, ReactNode } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
  raised?: boolean
  children: ReactNode
}

export function Card({ padding = 'md', hover, raised, className = '', children, ...rest }: Props) {
  const cls = `aa-card aa-card--pad-${padding}${hover ? ' aa-card--hover' : ''}${raised ? ' aa-card--raised' : ''} ${className}`.trim()
  return <div className={cls} {...rest}>{children}</div>
}
