'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { useAuth } from '@/lib/auth-context'
import { useChangePassword, useDeleteAccount } from '@/hooks/usePortfolio'
import { api } from '@/lib/api'
import { useTheme, THEMES } from '@/lib/theme-context'

interface AuditLog {
  id: string
  action: string
  ip_address: string
  user_agent: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Inicio de sesión',
  login_failed: 'Intento de login fallido',
  register: 'Registro',
  logout: 'Cierre de sesión',
  refresh_token: 'Renovación de token',
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 }
const labelStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-3)' }
const valueStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--text-1)', fontWeight: 'var(--weight-medium)' }
const monoStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-2)' }
const sectionHeadStyle: React.CSSProperties = { fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 16px' }

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [showAudit, setShowAudit] = useState(false)

  // Password
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const changePw = useChangePassword()

  async function handleChangePassword() {
    setPwError('')
    setPwSuccess(false)
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Las contraseñas nuevas no coinciden.'); return }
    if (pwForm.new_password.length < 12) { setPwError('Mínimo 12 caracteres, con letras y números.'); return }
    try {
      await changePw.mutateAsync({ current_password: pwForm.current_password, new_password: pwForm.new_password })
      setPwSuccess(true)
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPwError(detail ?? 'Error al cambiar la contraseña.')
    }
  }

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const deleteAccount = useDeleteAccount()

  async function handleDeleteAccount() {
    setDeleteError('')
    try {
      await deleteAccount.mutateAsync(confirmEmail)
      logout()
      router.push('/login')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setDeleteError(detail ?? 'Error al eliminar la cuenta.')
    }
  }

  const { data: auditLogs, isLoading: auditLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/api/v1/auth/audit').then(r => r.data),
    enabled: showAudit,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Configuración</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Tu cuenta y seguridad</p>
      </div>

      {/* Profile */}
      <Card padding="md">
        <p style={sectionHeadStyle}>Perfil</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={fieldStyle}><span style={labelStyle}>Email</span><span style={valueStyle}>{user?.email}</span></div>
          <div style={fieldStyle}><span style={labelStyle}>ID de usuario</span><span style={monoStyle}>{user?.id}</span></div>
          <div style={fieldStyle}>
            <span style={labelStyle}>Miembro desde</span>
            <span style={valueStyle}>{user?.created_at ? new Date(user.created_at).toLocaleDateString('es-AR', { dateStyle: 'long' }) : '—'}</span>
          </div>
        </div>
      </Card>

      {/* Apariencia */}
      <Card padding="md">
        <p style={sectionHeadStyle}>Apariencia</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 16px' }}>Elegí el tema de color de la aplicación. Se guarda en este dispositivo.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {THEMES.map(t => {
            const active = theme === t.value
            return (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                  background: active ? 'var(--accent-bg)' : 'var(--surface-inset)',
                  border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-2)'}`,
                  color: active ? 'var(--text-accent)' : 'var(--text-1)',
                  fontFamily: 'var(--font-ui)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
                  transition: 'background 130ms, border-color 130ms',
                }}
              >
                <span style={{ width: 22, height: 22, borderRadius: 6, background: t.swatch, border: '1px solid var(--border-2)', flex: 'none' }} />
                {t.label}
              </button>
            )
          })}
        </div>
      </Card>

      {/* Change password */}
      <Card padding="md">
        <p style={sectionHeadStyle}>Cambiar contraseña</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Contraseña actual" type="password" placeholder="••••••••" value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} autoComplete="current-password" />
          <Input label="Nueva contraseña" type="password" placeholder="Mínimo 8 caracteres" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} autoComplete="new-password" />
          <Input label="Confirmar nueva contraseña" type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} autoComplete="new-password" />
        </div>
        {pwError && <div style={{ marginTop: 12, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>{pwError}</div>}
        {pwSuccess && <div style={{ marginTop: 12, background: 'rgba(61,217,147,0.08)', border: '1px solid rgba(61,217,147,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--up)' }}>Contraseña actualizada correctamente.</div>}
        <div style={{ marginTop: 16 }}>
          <Button onClick={handleChangePassword} disabled={changePw.isPending}>{changePw.isPending ? 'Actualizando…' : 'Actualizar contraseña'}</Button>
        </div>
      </Card>

      {/* Session */}
      <Card padding="md">
        <p style={sectionHeadStyle}>Sesión</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 16px' }}>Al cerrar sesión se invalidará tu token de refresh. Tendrás que iniciar sesión de nuevo.</p>
        <Button variant="danger" onClick={logout}>Cerrar sesión</Button>
      </Card>

      {/* Audit log */}
      <Card padding="md">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAudit ? 16 : 0 }}>
          <p style={{ ...sectionHeadStyle, margin: 0 }}>Historial de accesos</p>
          <Button variant="secondary" size="sm" onClick={() => setShowAudit(v => !v)}>{showAudit ? 'Ocultar' : 'Ver historial'}</Button>
        </div>
        {showAudit && (
          <div>
            {auditLoading && <div style={{ height: 80, background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />}
            {!auditLoading && auditLogs?.length === 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)' }}>Sin registros todavía.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {auditLogs?.map(log => (
                <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-1)' }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-1)' }}>{ACTION_LABELS[log.action] ?? log.action}</span>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>IP: {log.ip_address}</p>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{new Date(log.created_at).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Danger zone */}
      <Card padding="md" style={{ border: '1px solid rgba(244,98,110,0.25)' }}>
        <p style={{ ...sectionHeadStyle, color: 'var(--down)' }}>Zona de peligro</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 16px' }}>Eliminar tu cuenta borra permanentemente todos tus datos: integraciones, alertas, historial y configuración. Esta acción no se puede deshacer.</p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Eliminar mi cuenta</Button>
      </Card>

      {/* Delete modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <Card padding="lg" raised style={{ width: '100%', maxWidth: 420 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 8px' }}>¿Eliminar tu cuenta?</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 16px' }}>
              Esta acción es permanente. Escribí tu email <strong style={{ color: 'var(--text-1)' }}>{user?.email}</strong> para confirmar.
            </p>
            <Input label="Email de confirmación" type="email" placeholder={user?.email} value={confirmEmail} onChange={e => setConfirmEmail(e.target.value)} />
            {deleteError && <div style={{ marginTop: 12, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 'var(--text-sm)', color: 'var(--down)' }}>{deleteError}</div>}
            <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setConfirmEmail(''); setDeleteError('') }}>Cancelar</Button>
              <Button variant="danger" onClick={handleDeleteAccount} disabled={deleteAccount.isPending}>{deleteAccount.isPending ? 'Eliminando…' : 'Eliminar cuenta'}</Button>
            </div>
          </Card>
        </div>
      )}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
