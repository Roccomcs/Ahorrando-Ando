'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AppLogo } from '@/components/ds/AppLogo'

const NAV = [
  { href: '/dashboard',    label: 'Dashboard',      icon: 'layout-dashboard' },
  { href: '/performance',  label: 'Performance',     icon: 'trending-up' },
  { href: '/history',      label: 'Historial',       icon: 'history' },
  { href: '/analytics',    label: 'Analytics',       icon: 'chart-pie' },
  { href: '/integrations', label: 'Integraciones',   icon: 'plug' },
  { href: '/alerts',       label: 'Alertas',         icon: 'bell' },
  { href: '/settings',     label: 'Configuración',   icon: 'settings' },
]

const ICON_PATHS: Record<string, string> = {
  'layout-dashboard': 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  'trending-up': 'M22 7l-8.5 8.5-5-5L1 18M16 7h6v6',
  'history': 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8',
  'chart-pie': 'M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z',
  'plug': 'M7 16.5v1.5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.5M12 3v13M8 6l-2-2M16 6l2-2M8 10H3M16 10h5',
  'bell': 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  'settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  'menu': 'M3 12h18M3 6h18M3 18h18',
  'x': 'M18 6 6 18M6 6l12 12',
}

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const d = ICON_PATHS[name]
  if (!d) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  // Close on route change (navigation)
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when open on mobile
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="aa-side__hamburger"
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        <NavIcon name={open ? 'x' : 'menu'} size={20} />
      </button>

      {/* Overlay backdrop on mobile */}
      {open && (
        <div
          className="aa-side__overlay"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside className={`aa-side${open ? ' aa-side--open' : ''}`}>
        <div className="aa-side__brand">
          <AppLogo size={26} />
          <div className="aa-side__wm">Ahorrando<br /><span>Ando</span></div>
        </div>
        <nav className="aa-side__nav">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <button
                className={`aa-side__item${pathname.startsWith(item.href) ? ' aa-side__item--on' : ''}`}
              >
                <NavIcon name={item.icon} size={18} />
                {item.label}
              </button>
            </Link>
          ))}
        </nav>
        <div className="aa-side__user">
          <span className="aa-side__email" title={user?.email}>{user?.email}</span>
          <button
            className="aa-icon-btn aa-icon-btn--sm"
            onClick={logout}
            title="Cerrar sesión"
          >
            <NavIcon name="log-out" size={15} />
          </button>
        </div>
      </aside>
    </>
  )
}
