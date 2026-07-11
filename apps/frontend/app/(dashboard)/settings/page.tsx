'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import { useAuth } from '@/lib/auth-context'
import { useChangePassword, useDeleteAccount } from '@/hooks/usePortfolio'
import { useTheme, THEMES } from '@/lib/theme-context'

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2 }
const labelStyle: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--text-3)' }
const valueStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', color: 'var(--text-1)', fontWeight: 'var(--weight-medium)' }
const monoStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-2)' }
const sectionHeadStyle: React.CSSProperties = { fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 16px' }

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Password
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const changePw = useChangePassword()

  async function handleChangePassword() {
    setPwError('')
    setPwSuccess(false)
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Las contraseñas nuevas no coinciden.'); return }
    if (pwForm.new_password.length < 8) { setPwError('Mínimo 8 caracteres, con letras y números.'); return }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600 }}>
      <div className="aa-sec aa-sec--1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Configuración</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '6px 0 6px', color: 'var(--text-1)' }}>Tu cuenta y seguridad</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Perfil, contraseña y preferencias.</p>
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
          <Input label="Nueva contraseña" type="password" placeholder="Mínimo 8 caracteres" value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} autoComplete="new-password" hint="Mínimo 8 caracteres, con letras y números" />
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
    </div>
  )
}
