'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  LineChart,
  Plug,
  Bell,
  BarChart2,
  TrendingUp,
  Settings,
  LogOut,
  Wallet,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useAlerts } from '@/hooks/usePortfolio'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { data: alerts } = useAlerts()
  const pendingAlerts = alerts?.filter((a) => a.is_active).length ?? 0
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { href: '/performance', label: 'Rendimiento', icon: TrendingUp, badge: null },
    { href: '/history', label: 'Historial', icon: LineChart, badge: null },
    { href: '/integrations', label: 'Integraciones', icon: Plug, badge: null },
    { href: '/alerts', label: 'Alertas', icon: Bell, badge: pendingAlerts || null },
    { href: '/analytics', label: 'Analytics', icon: BarChart2, badge: null },
    { href: '/settings', label: 'Configuración', icon: Settings, badge: null },
  ]

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-indigo-600" />
          <span className="font-bold text-gray-900">Ahorrando Ando</span>
        </div>
        {/* Botón cerrar en mobile */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-gray-400 hover:text-gray-600"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {badge !== null && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-semibold text-white">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-gray-100 px-4 py-4">
        <p className="truncate text-xs text-gray-500 mb-3">{user?.email}</p>
        <button
          onClick={() => { logout(); setMobileOpen(false) }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Hamburger button (mobile) ───────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-md border border-gray-200 text-gray-600 hover:text-gray-900"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Overlay (mobile) ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar desktop (siempre visible) ───────────────────────────────── */}
      <aside className="hidden md:flex h-full w-60 flex-col border-r border-gray-200 bg-white">
        {navContent}
      </aside>

      {/* ── Sidebar mobile (drawer) ──────────────────────────────────────────── */}
      <aside
        className={clsx(
          'md:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {navContent}
      </aside>
    </>
  )
}
