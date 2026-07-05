'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

function getInitial(email: string | undefined) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

// Avatar neutro (círculo oscuro con borde), coherente con el diseño.
const AVATAR_BG = 'var(--surface-3)'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initial = getInitial(user?.email)
  const color = AVATAR_BG
  const ring = 'rgba(65,164,239,0.30)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={user?.email}
        style={{
          width: 36, height: 36, borderRadius: '50%',
          background: color, border: '1px solid var(--border-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-1)', fontWeight: 700, fontSize: 14,
          fontFamily: 'var(--font-display)', cursor: 'pointer',
          transition: 'box-shadow 120ms',
          boxShadow: open ? `0 0 0 3px ${ring}` : 'none',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 0 3px ${ring}`)}
        onMouseLeave={e => { if (!open) e.currentTarget.style.boxShadow = 'none' }}
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        {initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 260, background: 'var(--surface-card)',
          border: '1px solid var(--border-2)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-overlay)',
          zIndex: 200, overflow: 'hidden',
          animation: 'fadeInDown 100ms ease-out',
        }}>
          <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

          {/* Header — info del usuario */}
          <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid var(--border-1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: color, border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-1)', fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', flex: 'none',
              }}>
                {initial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginBottom: 2 }}>Cuenta</div>
                <div style={{
                  fontSize: 'var(--text-sm)', color: 'var(--text-1)', fontWeight: 'var(--weight-medium)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.email}
                </div>
                {user?.email_verified === false && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--down)', marginTop: 3 }}>Email sin verificar</div>
                )}
              </div>
            </div>
          </div>

          {/* Opciones */}
          <div style={{ padding: '6px 0' }}>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              style={{ textDecoration: 'none' }}
            >
              <button style={itemStyle}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Configuración
              </button>
            </Link>
          </div>

          <div style={{ borderTop: '1px solid var(--border-1)', padding: '6px 0' }}>
            <button onClick={() => { setOpen(false); logout() }} style={{ ...itemStyle, color: 'var(--down)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
  padding: '9px 18px', background: 'none', border: 'none',
  fontSize: 'var(--text-sm)', color: 'var(--text-1)', cursor: 'pointer',
  textAlign: 'left', fontFamily: 'var(--font-ui)',
  transition: 'background 100ms',
}
