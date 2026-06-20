import { ReactNode } from 'react'

interface Props {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, body, action, icon }: Props) {
  return (
    <div className="aa-empty">
      {icon && <div className="aa-empty__icon">{icon}</div>}
      <p className="aa-empty__title">{title}</p>
      {body && <p className="aa-empty__body">{body}</p>}
      {action}
    </div>
  )
}
