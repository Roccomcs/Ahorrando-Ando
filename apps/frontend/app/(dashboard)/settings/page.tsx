'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

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
  const [showAudit, setShowAudit] = useState(false)

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
    </div>
  )
}
