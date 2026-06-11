'use client'

import { useRef, useState } from 'react'
import {
  Plus, Trash2, CheckCircle, XCircle, RefreshCw, AlertCircle,
  Upload, PlusCircle, MinusCircle, X, ExternalLink, Shield,
  ChevronRight, ChevronLeft,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useIntegrations,
  useAddIntegration,
  useDeleteIntegration,
  useSyncIntegration,
  useImportBalanzCSV,
} from '@/hooks/usePortfolio'
import type { ProviderType } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos y datos de configuración por provider
// ─────────────────────────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder: string; secret?: boolean }

type ProviderConfig = {
  value: ProviderType
  label: string
  tagline: string
  color: string
  type: 'fields' | 'csv' | 'manual'
  fields?: FieldDef[]
  instructions: {
    description: string
    steps: string[]
    credentialUrl?: string
    credentialUrlLabel?: string
    securityNote: string
  }
}

const PROVIDERS: ProviderConfig[] = [
  {
    value: 'binance',
    label: 'Binance',
    tagline: 'Exchange de cripto mundial',
    color: '#f59e0b',
    type: 'fields',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Binance API Key' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Tu Binance API Secret', secret: true },
    ],
    instructions: {
      description: 'Binance es el exchange de criptomonedas más grande del mundo. Vamos a conectar usando una API Key de solo lectura.',
      steps: [
        'Iniciá sesión en binance.com',
        'Andá a tu perfil (ícono arriba a la derecha) → Administración de API',
        'Hacé click en "Crear API" y elegí "Clave API generada por el sistema"',
        'Poné un nombre descriptivo, ej: "Ahorrando Ando"',
        'Completá la verificación 2FA',
        'En los permisos, activá solo "Habilitar lectura" — nunca habilites transferencias ni retiros',
        'Copiá la API Key y el Secret antes de cerrar (el Secret solo se muestra una vez)',
      ],
      credentialUrl: 'https://www.binance.com/en/my/settings/api-management',
      credentialUrlLabel: 'Ir a Administración de API →',
      securityNote: 'Solo usamos permisos de lectura. Nunca solicitamos ni podemos ejecutar retiros o transferencias.',
    },
  },
  {
    value: 'mercadopago',
    label: 'MercadoPago',
    tagline: 'Billetera digital argentina',
    color: '#3b82f6',
    type: 'fields',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'APP_USR-...', secret: true },
    ],
    instructions: {
      description: 'MercadoPago permite acceder al saldo de tu cuenta mediante un Access Token de producción.',
      steps: [
        'Andá a mercadopago.com.ar/developers',
        'Iniciá sesión con tu cuenta de MercadoPago',
        'En el panel, creá una nueva aplicación (si no tenés una ya)',
        'Entrá a la aplicación → "Credenciales de producción"',
        'Copiá el "Access Token" (empieza con APP_USR-...)',
      ],
      credentialUrl: 'https://www.mercadopago.com.ar/developers/panel',
      credentialUrlLabel: 'Ir al panel de desarrolladores →',
      securityNote: 'El access token permite leer tu saldo. No permite mover dinero.',
    },
  },
  {
    value: 'iol',
    label: 'InvertirOnline',
    tagline: 'Broker argentino (IOL)',
    color: '#6366f1',
    type: 'fields',
    fields: [
      { key: 'username', label: 'Usuario', placeholder: 'Tu email de IOL' },
      { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true },
    ],
    instructions: {
      description: 'InvertirOnline (IOL) es un broker argentino de acciones, bonos y FCI. Usamos tus credenciales de acceso para leer tus posiciones.',
      steps: [
        'Usamos las mismas credenciales con las que entrás a invertironline.com',
        'Ingresá tu email (usuario) y contraseña a continuación',
        'Recomendamos no usar una cuenta compartida con otras personas',
      ],
      credentialUrl: 'https://invertironline.com',
      credentialUrlLabel: 'Ir a InvertirOnline →',
      securityNote: 'Tus credenciales se cifran con AES-256 antes de guardarse. Solo hacemos llamadas de lectura a la API de IOL.',
    },
  },
  {
    value: 'bullmarket',
    label: 'BullMarket',
    tagline: 'Broker argentino',
    color: '#10b981',
    type: 'fields',
    fields: [
      { key: 'username', label: 'Usuario', placeholder: 'Tu usuario de BullMarket' },
      { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true },
    ],
    instructions: {
      description: 'BullMarket es un broker argentino de acciones y bonos. Usamos tus credenciales de la plataforma web.',
      steps: [
        'Andá a bullmarketbrokers.com e iniciá sesión',
        'Usá el mismo usuario y contraseña para conectar acá',
        'La sesión se renueva automáticamente cuando vence',
      ],
      credentialUrl: 'https://bullmarketbrokers.com',
      credentialUrlLabel: 'Ir a BullMarket →',
      securityNote: 'Tus credenciales se cifran con AES-256. Solo hacemos consultas de lectura.',
    },
  },
  {
    value: 'lemoncash',
    label: 'Lemon Cash',
    tagline: 'Exchange cripto argentino',
    color: '#22c55e',
    type: 'fields',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Lemon Cash API Key', secret: true },
    ],
    instructions: {
      description: 'Lemon Cash es un exchange de criptomonedas argentino. Conectamos mediante una API Key de solo lectura.',
      steps: [
        'Abrí la app de Lemon Cash en tu celular',
        'Andá a Perfil → Configuración → API',
        'Generá una nueva API Key',
        'Copiá la key y pegala en el campo de abajo',
      ],
      securityNote: 'La API Key de Lemon Cash solo permite leer tu saldo. No permite extracciones.',
    },
  },
  {
    value: 'onchain',
    label: 'Wallet EVM',
    tagline: 'Ethereum, Polygon o BSC',
    color: '#8b5cf6',
    type: 'fields',
    fields: [
      { key: 'address', label: 'Dirección de wallet', placeholder: '0x...' },
      { key: 'chain', label: 'Red', placeholder: 'ethereum · polygon · bsc' },
      { key: 'api_key', label: 'API Key Etherscan/BscScan (opcional)', placeholder: 'Dejar vacío para usar la gratuita' },
    ],
    instructions: {
      description: 'Conectá cualquier wallet EVM-compatible: Ethereum, Polygon o BSC. Solo necesitamos tu dirección pública.',
      steps: [
        'Abrí tu wallet (MetaMask, Rabby, Frame, etc.)',
        'Copiá tu dirección pública — empieza con 0x y tiene 42 caracteres',
        'Elegí la red: ethereum, polygon o bsc',
        'La API Key de Etherscan/BscScan es opcional — sin ella se usa la cuota gratuita que puede ser más lenta',
      ],
      credentialUrl: 'https://etherscan.io/myapikey',
      credentialUrlLabel: 'Obtener API Key de Etherscan (gratis) →',
      securityNote: 'Solo necesitamos la dirección pública. Nunca pedimos ni guardamos claves privadas ni frases semilla.',
    },
  },
  {
    value: 'solana',
    label: 'Wallet Solana',
    tagline: 'Red Solana (SOL + SPL tokens)',
    color: '#a855f7',
    type: 'fields',
    fields: [
      { key: 'address', label: 'Dirección Solana', placeholder: 'Ej: 4Nd1mBQtrMJVYVfKf2PX98...' },
    ],
    instructions: {
      description: 'Conectá una wallet de Solana para ver tu balance de SOL y tokens SPL (USDC, RAY, JUP y más).',
      steps: [
        'Abrí tu wallet Solana (Phantom, Solflare, Backpack, etc.)',
        'Copiá tu dirección pública — tiene entre 32 y 44 caracteres en base58',
        'Pegala en el campo de abajo',
      ],
      securityNote: 'Solo necesitamos la dirección pública. Sin claves privadas ni frases semilla.',
    },
  },
  {
    value: 'balanz_csv',
    label: 'Balanz',
    tagline: 'Importar portfolio via CSV',
    color: '#ec4899',
    type: 'csv',
    instructions: {
      description: 'Balanz no tiene API pública. Podés importar tu portfolio exportando un CSV desde su plataforma.',
      steps: [
        'Iniciá sesión en balanz.com',
        'Andá a Mi Cuenta → Mi Cartera o Posiciones',
        'Buscá la opción "Exportar" o "Descargar CSV"',
        'Guardá el archivo .csv',
        'Subilo en el formulario de la siguiente pantalla',
      ],
      credentialUrl: 'https://balanz.com',
      credentialUrlLabel: 'Ir a Balanz →',
      securityNote: 'El archivo CSV solo contiene tus posiciones. No incluye datos de acceso a tu cuenta.',
    },
  },
  {
    value: 'manual',
    label: 'Manual',
    tagline: 'Cocos, Naranja X, Ualá y más',
    color: '#64748b',
    type: 'manual',
    instructions: {
      description: 'Para cuentas sin API ni exportación CSV: ingresá los valores manualmente. Ideal para Cocos Capital, Naranja X, Ualá, o cualquier cuenta de ahorro.',
      steps: [
        'Ingresá el nombre de la institución (ej: Cocos Capital)',
        'Agregá cada activo con su símbolo (ej: USD, ARS, BTC), cantidad y precio actual en USD',
        'Para actualizar los valores, eliminá esta integración y creá una nueva con los datos actualizados',
      ],
      securityNote: 'Los valores se guardan en tu cuenta y solo son visibles para vos.',
    },
  },
]

type ManualHolding = { name: string; symbol: string; amount: string; price_usd: string }
const emptyHolding = (): ManualHolding => ({ name: '', symbol: '', amount: '', price_usd: '' })

// ─────────────────────────────────────────────────────────────────────────────
// Componente: ProviderCard (grilla de selección)
// ─────────────────────────────────────────────────────────────────────────────

function ProviderCard({
  config,
  connected,
  onClick,
}: {
  config: ProviderConfig
  connected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={connected ? undefined : onClick}
      disabled={connected}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        connected
          ? 'border-green-200 bg-green-50 cursor-default opacity-70'
          : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: config.color }}
        >
          {config.label.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{config.label}</p>
          <p className="text-xs text-gray-400 truncate">{config.tagline}</p>
        </div>
        {connected
          ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente: Wizard modal (2 pasos)
// ─────────────────────────────────────────────────────────────────────────────

function WizardModal({
  config,
  onClose,
  onSuccess,
}: {
  config: ProviderConfig
  onClose: () => void
  onSuccess: () => void
}) {
  const addMutation = useAddIntegration()
  const importCSV = useImportBalanzCSV()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [institutionName, setInstitutionName] = useState('')
  const [manualHoldings, setManualHoldings] = useState<ManualHolding[]>([emptyHolding()])
  const [error, setError] = useState('')

  const isSubmitting = addMutation.isPending || importCSV.isPending

  async function handleConnect() {
    setError('')
    try {
      if (config.type === 'csv') {
        if (!csvFile) { setError('Seleccioná un archivo CSV.'); return }
        await importCSV.mutateAsync(csvFile)
      } else if (config.type === 'manual') {
        if (!institutionName.trim()) { setError('Ingresá el nombre de la institución.'); return }
        const holdings = manualHoldings
          .filter((h) => h.symbol.trim() && parseFloat(h.amount) > 0)
          .map((h) => ({
            symbol: h.symbol.toUpperCase(),
            name: h.name || h.symbol.toUpperCase(),
            amount: parseFloat(h.amount),
            price_usd: parseFloat(h.price_usd) || 0,
          }))
        if (!holdings.length) { setError('Agregá al menos un activo con cantidad > 0.'); return }
        await addMutation.mutateAsync({
          provider_type: 'manual',
          credentials: { institution_name: institutionName, holdings },
        })
      } else {
        await addMutation.mutateAsync({ provider_type: config.value, credentials })
      }
      onSuccess()
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail ?? 'Error al conectar. Verificá los datos e intentá de nuevo.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-100">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
            style={{ backgroundColor: config.color }}
          >
            {config.label.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{config.label}</h2>
            <p className="text-xs text-gray-400">{config.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100">
          <StepDot n={1} active={step === 1} done={step === 2} label="Instrucciones" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepDot n={2} active={step === 2} done={false} label="Conectar" />
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── Paso 1: Instrucciones ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{config.instructions.description}</p>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Pasos
                </p>
                <ol className="space-y-2">
                  {config.instructions.steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-gray-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {config.instructions.credentialUrl && (
                <a
                  href={config.instructions.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  {config.instructions.credentialUrlLabel ?? 'Abrir →'}
                </a>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-green-50 px-4 py-3">
                <Shield className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">{config.instructions.securityNote}</p>
              </div>
            </div>
          )}

          {/* ── Paso 2: Formulario ── */}
          {step === 2 && (
            <div className="space-y-4">
              {config.type === 'fields' && config.fields && (
                <div className="space-y-3">
                  {config.fields.map((field) => (
                    <Input
                      key={field.key}
                      label={field.label}
                      type={field.secret ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={credentials[field.key] ?? ''}
                      onChange={(e) =>
                        setCredentials((c) => ({ ...c, [field.key]: e.target.value }))
                      }
                    />
                  ))}
                </div>
              )}

              {config.type === 'csv' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Subí el CSV exportado desde Balanz. Las columnas esperadas son: símbolo, cantidad, precio.
                  </p>
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 cursor-pointer hover:border-indigo-400 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 text-gray-300" />
                    {csvFile
                      ? <p className="text-sm font-medium text-indigo-600">{csvFile.name}</p>
                      : <p className="text-sm text-gray-400">Hacé click para seleccionar el archivo .csv</p>}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              )}

              {config.type === 'manual' && (
                <div className="space-y-3">
                  <Input
                    label="Nombre de la institución"
                    placeholder="Ej: Cocos Capital, Naranja X, Ualá..."
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                  />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Activos / posiciones
                  </p>
                  {manualHoldings.map((h, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                      <Input
                        label="Símbolo"
                        placeholder="USD"
                        value={h.symbol}
                        onChange={(e) =>
                          setManualHoldings((arr) =>
                            arr.map((x, i) => i === idx ? { ...x, symbol: e.target.value } : x)
                          )
                        }
                      />
                      <Input
                        label="Nombre"
                        placeholder="Dólar"
                        value={h.name}
                        onChange={(e) =>
                          setManualHoldings((arr) =>
                            arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x)
                          )
                        }
                      />
                      <Input
                        label="Cantidad"
                        placeholder="100"
                        value={h.amount}
                        onChange={(e) =>
                          setManualHoldings((arr) =>
                            arr.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x)
                          )
                        }
                      />
                      <Input
                        label="Precio USD"
                        placeholder="1.00"
                        value={h.price_usd}
                        onChange={(e) =>
                          setManualHoldings((arr) =>
                            arr.map((x, i) => i === idx ? { ...x, price_usd: e.target.value } : x)
                          )
                        }
                      />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setManualHoldings((arr) => [...arr, emptyHolding()])}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Agregar activo
                    </button>
                    {manualHoldings.length > 1 && (
                      <button
                        onClick={() => setManualHoldings((arr) => arr.slice(0, -1))}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        <MinusCircle className="h-3.5 w-3.5" /> Quitar último
                      </button>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Cancelar' : 'Volver'}
          </button>

          {step === 1 ? (
            <Button onClick={() => setStep(2)}>
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleConnect} loading={isSubmitting}>
              Conectar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepDot({
  n, active, done, label,
}: {
  n: number; active: boolean; done: boolean; label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : done
            ? 'bg-green-500 text-white'
            : 'bg-gray-200 text-gray-500'
      }`}>
        {done ? '✓' : n}
      </div>
      <span className={`text-xs font-medium ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations()
  const deleteMutation = useDeleteIntegration()
  const syncMutation = useSyncIntegration()

  const [activeWizard, setActiveWizard] = useState<ProviderConfig | null>(null)

  const connectedTypes = new Set(integrations?.map((i) => i.provider_type) ?? [])

  function handleWizardSuccess() {
    setActiveWizard(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integraciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conectá tus cuentas financieras</p>
      </div>

      {/* ── Cuentas conectadas ──────────────────────────────────────────────── */}
      {!isLoading && integrations && integrations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Cuentas conectadas ({integrations.length})
          </h2>
          <div className="space-y-2">
            {integrations.map((i) => {
              const cfg = PROVIDERS.find((p) => p.value === i.provider_type)
              return (
                <Card key={i.id} className="py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: cfg?.color ?? '#6366f1' }}
                      >
                        {(cfg?.label ?? i.provider_type).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800 text-sm">
                            {cfg?.label ?? i.provider_type}
                          </p>
                          {i.is_active
                            ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-gray-400 truncate">
                          {i.is_active
                            ? i.last_sync_at
                              ? `Sync: ${new Date(i.last_sync_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                              : 'Conectada'
                            : 'Inactiva'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {i.provider_type !== 'balanz_csv' && i.provider_type !== 'manual' && (
                        <Button
                          variant="ghost"
                          onClick={() => syncMutation.mutate(i.id)}
                          loading={syncMutation.isPending && syncMutation.variables === i.id}
                          title="Sincronizar ahora"
                          className="text-indigo-500 hover:bg-indigo-50"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(i.id)}
                        loading={deleteMutation.isPending && deleteMutation.variables === i.id}
                        className="text-red-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {i.last_error && (
                    <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{i.last_error}</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200" />)}
        </div>
      )}

      {/* ── Agregar nueva cuenta ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Agregar cuenta
          </h2>
          <p className="text-xs text-gray-400">Hacé click en cualquier provider para conectar</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p.value}
              config={p}
              connected={connectedTypes.has(p.value)}
              onClick={() => setActiveWizard(p)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
          <Shield className="h-3.5 w-3.5" />
          <span>Todas las credenciales se cifran con AES-256 y nunca se almacenan en texto plano.</span>
        </div>
      </div>

      {/* Wizard modal */}
      {activeWizard && (
        <WizardModal
          config={activeWizard}
          onClose={() => setActiveWizard(null)}
          onSuccess={handleWizardSuccess}
        />
      )}
    </div>
  )
}
