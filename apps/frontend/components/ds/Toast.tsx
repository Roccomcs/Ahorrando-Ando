'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'loading'
interface ToastItem { id: number; kind: ToastKind; message: string }

interface ToastApi {
  show: (kind: ToastKind, message: string) => number
  update: (id: number, kind: ToastKind, message: string) => void
  dismiss: (id: number) => void
  success: (message: string) => number
  error: (message: string) => number
}

const ToastCtx = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id))
    const tm = timers.current.get(id)
    if (tm) { clearTimeout(tm); timers.current.delete(id) }
  }, [])

  const armAutoDismiss = useCallback((id: number, ms = 3500) => {
    const tm = setTimeout(() => dismiss(id), ms)
    timers.current.set(id, tm)
  }, [dismiss])

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current
    setToasts(ts => [...ts, { id, kind, message }])
    if (kind !== 'loading') armAutoDismiss(id)  // loading persiste hasta update/dismiss
    return id
  }, [armAutoDismiss])

  const update = useCallback((id: number, kind: ToastKind, message: string) => {
    setToasts(ts => ts.map(t => (t.id === id ? { ...t, kind, message } : t)))
    if (kind !== 'loading') armAutoDismiss(id)
  }, [armAutoDismiss])

  const api: ToastApi = {
    show, update, dismiss,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 400, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        {toasts.map(t => <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />)}
      </div>
      <style>{`@keyframes aa-toast-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes aa-spin { to { transform: rotate(360deg); } }`}</style>
    </ToastCtx.Provider>
  )
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const color =
    toast.kind === 'success' ? 'var(--positive)' :
    toast.kind === 'error' ? 'var(--negative)' : 'var(--primary)'
  return (
    <div role="status" aria-live="polite"
      style={{
        pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
        minWidth: 240, maxWidth: 360, padding: '12px 14px',
        background: 'var(--surface-elevated)', border: '1px solid var(--border-2)',
        borderLeft: `3px solid ${color}`, borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)', color: 'var(--text-1)', fontSize: 'var(--text-sm)',
        animation: 'aa-toast-in 0.22s var(--ease-out)',
      }}>
      <span style={{ color, display: 'flex', flexShrink: 0 }}>
        {toast.kind === 'loading' ? <Spinner /> : toast.kind === 'success' ? <CheckMark /> : <Cross />}
      </span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      {toast.kind !== 'loading' && (
        <button onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
          <Cross size={14} />
        </button>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'aa-spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function CheckMark() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function Cross({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
