'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'
import { useChangePassword, useDeleteAccount } from '@/hooks/usePortfolio'
import { api } from '@/lib/api'

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

export default function SettingsPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [showAudit, setShowAudit] = useState(false)

  // Change password
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const changePw = useChangePassword()

  async function handleChangePassword() {
    setPwError('')
    setPwSuccess(false)
    if (pwForm.new_password !== pwForm.confirm) {
      setPwError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (pwForm.new_password.length < 8) {
      setPwError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
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
    queryFn: () => api.get('/api/v1/auth/audit').then((r) => r.data),
    enabled: showAudit,
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu cuenta y seguridad</p>
      </div>

      {/* Perfil */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">Perfil</h2>
        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-400">Email</p>
            <p className="text-sm font-medium text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">ID de usuario</p>
            <p className="text-xs text-gray-500 font-mono">{user?.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Miembro desde</p>
            <p className="text-sm text-gray-700">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('es-AR', { dateStyle: 'long' })
                : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Cambio de contraseña */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>
        <div className="space-y-3">
          <Input
            label="Contraseña actual"
            type="password"
            placeholder="••••••••"
            value={pwForm.current_password}
            onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={pwForm.new_password}
            onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            placeholder="••••••••"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
          />
        </div>
        {pwError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{pwError}</p>
        )}
        {pwSuccess && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
            Contraseña actualizada correctamente.
          </p>
        )}
        <div className="mt-4">
          <Button onClick={handleChangePassword} loading={changePw.isPending}>
            Actualizar contraseña
          </Button>
        </div>
      </Card>

      {/* Sesión */}
      <Card>
        <h2 className="font-semibold text-gray-800 mb-4">Sesión</h2>
        <p className="text-sm text-gray-500 mb-4">
          Al cerrar sesión se invalidará tu token de refresh. Tendrás que iniciar sesión de nuevo.
        </p>
        <Button variant="danger" onClick={logout}>
          Cerrar sesión
        </Button>
      </Card>

      {/* Historial de accesos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Historial de accesos</h2>
          <Button variant="secondary" onClick={() => setShowAudit((v) => !v)}>
            {showAudit ? 'Ocultar' : 'Ver historial'}
          </Button>
        </div>

        {showAudit && (
          <div>
            {auditLoading && <div className="h-32 animate-pulse rounded-lg bg-gray-100" />}
            {!auditLoading && auditLogs?.length === 0 && (
              <p className="text-sm text-gray-400">Sin registros todavía.</p>
            )}
            <div className="divide-y divide-gray-50">
              {auditLogs?.map((log) => (
                <div key={log.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">IP: {log.ip_address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Eliminar cuenta */}
      <Card className="border-red-200">
        <h2 className="font-semibold text-red-700 mb-2">Zona de peligro</h2>
        <p className="text-sm text-gray-500 mb-4">
          Eliminar tu cuenta borra permanentemente todos tus datos: integraciones, alertas, historial y configuración. Esta acción no se puede deshacer.
        </p>
        <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
          Eliminar mi cuenta
        </Button>
      </Card>

      {/* Modal confirmar eliminación */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">¿Eliminar tu cuenta?</h2>
            <p className="text-sm text-gray-500 mb-4">
              Esta acción es permanente. Escribí tu email <strong>{user?.email}</strong> para confirmar.
            </p>
            <Input
              label="Email de confirmación"
              type="email"
              placeholder={user?.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
            {deleteError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setConfirmEmail(''); setDeleteError('') }}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteAccount} loading={deleteAccount.isPending}>
                Eliminar cuenta
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
