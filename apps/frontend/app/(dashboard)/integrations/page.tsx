'use client'

import { useState } from 'react'
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIntegrations, useAddIntegration, useDeleteIntegration } from '@/hooks/usePortfolio'
import type { ProviderType } from '@/lib/types'

type ProviderConfig = {
  value: ProviderType
  label: string
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[]
}

const PROVIDERS: ProviderConfig[] = [
  {
    value: 'binance',
    label: 'Binance',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Binance API Key' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Tu Binance API Secret', secret: true },
    ],
  },
  {
    value: 'mercadopago',
    label: 'MercadoPago',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'APP_USR-...', secret: true },
    ],
  },
  {
    value: 'lemoncash',
    label: 'Lemon Cash',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Lemon Cash API Key', secret: true },
    ],
  },
  {
    value: 'iol',
    label: 'InvertirOnline',
    fields: [
      { key: 'username', label: 'Usuario', placeholder: 'Tu usuario de IOL' },
      { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true },
    ],
  },
  {
    value: 'onchain',
    label: 'Wallet ETH/MATIC',
    fields: [
      { key: 'address', label: 'Dirección', placeholder: '0x...' },
      { key: 'chain', label: 'Red', placeholder: 'ethereum o polygon' },
      { key: 'api_key', label: 'Etherscan API Key (opcional)', placeholder: 'Dejar vacío para usar la default' },
    ],
  },
  {
    value: 'bullmarket',
    label: 'BullMarket',
    fields: [
      { key: 'username', label: 'Usuario', placeholder: 'Tu usuario de BullMarket' },
      { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true },
    ],
  },
]

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations()
  const addMutation = useAddIntegration()
  const deleteMutation = useDeleteIntegration()
  const [showModal, setShowModal] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('binance')
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  const providerConfig = PROVIDERS.find((p) => p.value === selectedProvider)!

  function handleProviderChange(v: ProviderType) {
    setSelectedProvider(v)
    setCredentials({})
    setError('')
  }

  async function handleAdd() {
    setError('')
    try {
      await addMutation.mutateAsync({ provider_type: selectedProvider, credentials })
      setShowModal(false)
      setCredentials({})
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Error al conectar la integración. Verificá las credenciales.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Conectá tus cuentas financieras</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-200" />)}
        </div>
      )}

      {!isLoading && integrations?.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-gray-400 text-sm">No tenés integraciones. Hacé click en "Agregar" para conectar tu primera cuenta.</p>
        </Card>
      )}

      <div className="space-y-3">
        {integrations?.map((i) => (
          <Card key={i.id} className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              {i.is_active
                ? <CheckCircle className="h-5 w-5 text-green-500" />
                : <XCircle className="h-5 w-5 text-red-400" />}
              <div>
                <p className="font-medium text-gray-800 capitalize">{i.provider_type}</p>
                <p className="text-xs text-gray-400">{i.is_active ? 'Conectada' : 'Inactiva'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => deleteMutation.mutate(i.id)}
              loading={deleteMutation.isPending}
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar integración</h2>

            {/* Selector de provider */}
            <div className="flex gap-2 mb-4">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedProvider === p.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="space-y-3 mb-4">
              {providerConfig.fields.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  type={field.secret ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ''}
                  onChange={(e) => setCredentials((c) => ({ ...c, [field.key]: e.target.value }))}
                />
              ))}
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 mb-4">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => { setShowModal(false); setError('') }}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} loading={addMutation.isPending}>
                Conectar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
