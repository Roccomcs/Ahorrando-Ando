'use client'

import { useRef, useState } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import {
  useIntegrations, useAddIntegration, useDeleteIntegration,
  useSyncIntegration, useImportBalanzCSV,
} from '@/hooks/usePortfolio'
import type { ProviderType } from '@/lib/types'

// ── Types & config ────────────────────────────────────────────────────────────

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
    value: 'binance', label: 'Binance', tagline: 'Exchange de cripto mundial', color: '#E8C268', type: 'fields',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Binance API Key' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Tu Binance API Secret', secret: true },
    ],
    instructions: {
      description: 'Binance es el exchange de criptomonedas más grande del mundo. Conectamos usando una API Key de solo lectura.',
      steps: ['Iniciá sesión en binance.com', 'Perfil → Administración de API → Crear API', 'Elegí "Clave API generada por el sistema"', 'Activá solo "Habilitar lectura" — nunca transferencias ni retiros', 'Copiá la API Key y el Secret antes de cerrar'],
      credentialUrl: 'https://www.binance.com/en/my/settings/api-management',
      credentialUrlLabel: 'Ir a Administración de API →',
      securityNote: 'Solo usamos permisos de lectura. Nunca podemos ejecutar retiros o transferencias.',
    },
  },
  {
    value: 'mercadopago', label: 'MercadoPago', tagline: 'Billetera digital argentina', color: '#63B8F4', type: 'fields',
    fields: [{ key: 'access_token', label: 'Access Token', placeholder: 'APP_USR-...', secret: true }],
    instructions: {
      description: 'MercadoPago permite acceder al saldo mediante un Access Token de producción.',
      steps: ['Andá a mercadopago.com.ar/developers', 'Creá o elegí una aplicación', 'Entrá a "Credenciales de producción"', 'Copiá el Access Token (empieza con APP_USR-)'],
      credentialUrl: 'https://www.mercadopago.com.ar/developers/panel',
      credentialUrlLabel: 'Ir al panel de desarrolladores →',
      securityNote: 'El access token permite leer tu saldo. No permite mover dinero.',
    },
  },
  {
    value: 'iol', label: 'InvertirOnline', tagline: 'Broker argentino (IOL)', color: '#9D8CFF', type: 'fields',
    fields: [{ key: 'username', label: 'Usuario', placeholder: 'Tu email de IOL' }, { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true }],
    instructions: {
      description: 'InvertirOnline (IOL) es un broker argentino de acciones, bonos y FCI.',
      steps: ['Usamos las mismas credenciales de invertironline.com', 'Ingresá tu email y contraseña', 'Recomendamos no usar una cuenta compartida'],
      credentialUrl: 'https://invertironline.com', credentialUrlLabel: 'Ir a InvertirOnline →',
      securityNote: 'Tus credenciales se cifran con AES-256. Solo hacemos llamadas de lectura.',
    },
  },
  {
    value: 'bullmarket', label: 'BullMarket', tagline: 'Broker argentino', color: '#3DD993', type: 'fields',
    fields: [{ key: 'username', label: 'Usuario', placeholder: 'Tu usuario de BullMarket' }, { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true }],
    instructions: {
      description: 'BullMarket es un broker argentino de acciones y bonos.',
      steps: ['Andá a bullmarketbrokers.com e iniciá sesión', 'Usá el mismo usuario y contraseña para conectar', 'La sesión se renueva automáticamente'],
      credentialUrl: 'https://bullmarketbrokers.com', credentialUrlLabel: 'Ir a BullMarket →',
      securityNote: 'Tus credenciales se cifran con AES-256. Solo hacemos consultas de lectura.',
    },
  },
  {
    value: 'lemoncash', label: 'Lemon Cash', tagline: 'Exchange cripto argentino', color: '#45D4C8', type: 'fields',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'Tu Lemon Cash API Key', secret: true }],
    instructions: {
      description: 'Lemon Cash es un exchange de criptomonedas argentino.',
      steps: ['Abrí la app de Lemon Cash', 'Perfil → Configuración → API', 'Generá una nueva API Key', 'Copiá y pegá la key abajo'],
      securityNote: 'La API Key de Lemon solo permite leer tu saldo. No permite extracciones.',
    },
  },
  {
    value: 'onchain', label: 'Wallet EVM', tagline: 'Ethereum, Polygon o BSC', color: '#F08FB7', type: 'fields',
    fields: [
      { key: 'address', label: 'Dirección de wallet', placeholder: '0x...' },
      { key: 'chain', label: 'Red', placeholder: 'ethereum · polygon · bsc' },
      { key: 'api_key', label: 'API Key Etherscan (opcional)', placeholder: 'Dejar vacío para usar la gratuita' },
    ],
    instructions: {
      description: 'Conectá cualquier wallet EVM: Ethereum, Polygon o BSC. Solo necesitamos tu dirección pública.',
      steps: ['Abrí tu wallet (MetaMask, Rabby, etc.)', 'Copiá tu dirección pública (empieza con 0x)', 'Elegí la red: ethereum, polygon o bsc', 'La API Key es opcional'],
      credentialUrl: 'https://etherscan.io/myapikey', credentialUrlLabel: 'Obtener API Key de Etherscan (gratis) →',
      securityNote: 'Solo necesitamos la dirección pública. Nunca pedimos claves privadas ni frases semilla.',
    },
  },
  {
    value: 'solana', label: 'Wallet Solana', tagline: 'SOL + SPL tokens', color: '#B5D85A', type: 'fields',
    fields: [{ key: 'address', label: 'Dirección Solana', placeholder: 'Ej: 4Nd1mBQtrMJVYVfKf2PX98...' }],
    instructions: {
      description: 'Conectá una wallet Solana para ver SOL y tokens SPL.',
      steps: ['Abrí tu wallet (Phantom, Solflare, etc.)', 'Copiá tu dirección pública (32–44 caracteres base58)', 'Pegala abajo'],
      securityNote: 'Solo necesitamos la dirección pública. Sin claves privadas ni frases semilla.',
    },
  },
  {
    value: 'balanz_csv', label: 'Balanz', tagline: 'Importar portfolio via CSV', color: '#F4626E', type: 'csv',
    instructions: {
      description: 'Balanz no tiene API pública. Importá tu portfolio exportando un CSV desde su plataforma.',
      steps: ['Iniciá sesión en balanz.com', 'Mi Cuenta → Mi Cartera o Posiciones', 'Buscá "Exportar" o "Descargar CSV"', 'Guardá el archivo .csv', 'Subilo en el formulario de la siguiente pantalla'],
      credentialUrl: 'https://balanz.com', credentialUrlLabel: 'Ir a Balanz →',
      securityNote: 'El CSV solo contiene tus posiciones. No incluye datos de acceso.',
    },
  },
  {
    value: 'manual', label: 'Manual', tagline: 'Cocos, Naranja X, Ualá y más', color: '#8A97AB', type: 'manual',
    instructions: {
      description: 'Para cuentas sin API ni CSV: ingresá los valores manualmente. Ideal para Cocos Capital, Naranja X, Ualá, etc.',
      steps: ['Ingresá el nombre de la institución', 'Agregá cada activo con símbolo, cantidad y precio USD', 'Para actualizar, eliminá y creá una nueva integración'],
      securityNote: 'Los valores se guardan en tu cuenta y solo son visibles para vos.',
    },
  },
]

type ManualHolding = { name: string; symbol: string; amount: string; price_usd: string }
const emptyHolding = (): ManualHolding => ({ name: '', symbol: '', amount: '', price_usd: '' })

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function XCircleIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> }
function RefreshIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function ChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function ChevLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function UploadIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function ExtLinkIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg> }
function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function MinusIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg> }

// ── StepDot ───────────────────────────────────────────────────────────────────

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  const bg = active ? 'var(--action-primary)' : done ? 'var(--up)' : 'var(--surface-hover)'
  const color = (active || done) ? '#fff' : 'var(--text-3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {done ? '✓' : n}
      </div>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: active ? 'var(--text-accent)' : 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

// ── ProviderPicker card ───────────────────────────────────────────────────────

function ProviderPickerCard({ config, connected, onClick }: { config: ProviderConfig; connected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={connected ? undefined : onClick} disabled={connected}
      style={{ width: '100%', textAlign: 'left', borderRadius: 'var(--radius-lg)', border: '1px solid', cursor: connected ? 'default' : 'pointer', padding: 14, background: connected ? 'rgba(61,217,147,0.04)' : hovered ? 'var(--surface-hover)' : 'var(--surface-card)', borderColor: connected ? 'rgba(61,217,147,0.25)' : hovered ? 'var(--border-2)' : 'var(--border-1)', transition: 'all var(--dur-fast) var(--ease-out)', opacity: connected ? 0.75 : 1 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color: '#fff', flexShrink: 0 }}>
          {config.label.charAt(0)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>{config.label}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{config.tagline}</p>
        </div>
        <div style={{ flexShrink: 0, color: connected ? 'var(--up)' : 'var(--text-3)' }}>
          {connected ? <CheckIcon /> : <ChevRight />}
        </div>
      </div>
    </button>
  )
}

// ── Wizard modal ──────────────────────────────────────────────────────────────

function WizardModal({ config, onClose, onSuccess }: { config: ProviderConfig; onClose: () => void; onSuccess: () => void }) {
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
        const holdings = manualHoldings.filter(h => h.symbol.trim() && parseFloat(h.amount) > 0).map(h => ({ symbol: h.symbol.toUpperCase(), name: h.name || h.symbol.toUpperCase(), amount: parseFloat(h.amount), price_usd: parseFloat(h.price_usd) || 0 }))
        if (!holdings.length) { setError('Agregá al menos un activo con cantidad > 0.'); return }
        await addMutation.mutateAsync({ provider_type: 'manual', credentials: { institution_name: institutionName, holdings } })
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', padding: 24, overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface-elevated)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-lg)', background: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: '#fff', flexShrink: 0 }}>
            {config.label.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)', margin: 0 }}>{config.label}</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>{config.tagline}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--border-1)' }}>
          <StepDot n={1} active={step === 1} done={step === 2} label="Instrucciones" />
          <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
          <StepDot n={2} active={step === 2} done={false} label="Conectar" />
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>{config.instructions.description}</p>
              <div>
                <span className="aa-overline" style={{ display: 'block', marginBottom: 10 }}>Pasos</span>
                <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {config.instructions.steps.map((s, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-inset)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-accent)', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              {config.instructions.credentialUrl && (
                <a href={config.instructions.credentialUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-accent)', textDecoration: 'none' }}>
                  <ExtLinkIcon />{config.instructions.credentialUrlLabel ?? 'Abrir →'}
                </a>
              )}
              <div style={{ display: 'flex', gap: 8, background: 'rgba(61,217,147,0.06)', border: '1px solid rgba(61,217,147,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <span style={{ color: 'var(--up)', flexShrink: 0 }}><ShieldIcon /></span>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--up)', margin: 0 }}>{config.instructions.securityNote}</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {config.type === 'fields' && config.fields && config.fields.map(field => (
                <Input key={field.key} label={field.label} type={field.secret ? 'password' : 'text'} placeholder={field.placeholder} value={credentials[field.key] ?? ''} onChange={e => setCredentials(c => ({ ...c, [field.key]: e.target.value }))} />
              ))}

              {config.type === 'csv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Subí el CSV exportado desde Balanz.</p>
                  <div onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-2)', padding: 28, cursor: 'pointer', transition: 'border-color var(--dur-fast) var(--ease-out)' }}>
                    <span style={{ color: 'var(--text-3)' }}><UploadIcon /></span>
                    {csvFile
                      ? <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-accent)', margin: 0 }}>{csvFile.name}</p>
                      : <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>Hacé click para seleccionar el .csv</p>}
                  </div>
                  <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                </div>
              )}

              {config.type === 'manual' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Input label="Nombre de la institución" placeholder="Ej: Cocos Capital, Naranja X, Ualá..." value={institutionName} onChange={e => setInstitutionName(e.target.value)} />
                  <span className="aa-overline">Activos / posiciones</span>
                  {manualHoldings.map((h, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                      <Input label="Símbolo" placeholder="USD" value={h.symbol} onChange={e => setManualHoldings(arr => arr.map((x, i) => i === idx ? { ...x, symbol: e.target.value } : x))} />
                      <Input label="Nombre" placeholder="Dólar" value={h.name} onChange={e => setManualHoldings(arr => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                      <Input label="Cantidad" placeholder="100" value={h.amount} onChange={e => setManualHoldings(arr => arr.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))} />
                      <Input label="Precio USD" placeholder="1.00" value={h.price_usd} onChange={e => setManualHoldings(arr => arr.map((x, i) => i === idx ? { ...x, price_usd: e.target.value } : x))} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <button onClick={() => setManualHoldings(arr => [...arr, emptyHolding()])} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <PlusIcon /> Agregar activo
                    </button>
                    {manualHoldings.length > 1 && (
                      <button onClick={() => setManualHoldings(arr => arr.slice(0, -1))} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', color: 'var(--down)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <MinusIcon /> Quitar último
                      </button>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div style={{ display: 'flex', gap: 8, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <span style={{ color: 'var(--down)', flexShrink: 0 }}><AlertIcon /></span>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--down)', margin: 0 }}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-1)' }}>
          <button onClick={step === 1 ? onClose : () => setStep(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevLeft />{step === 1 ? 'Cancelar' : 'Volver'}
          </button>
          {step === 1
            ? <Button onClick={() => setStep(2)} icon={<ChevRight />}>Siguiente</Button>
            : <Button onClick={handleConnect} disabled={isSubmitting}>{isSubmitting ? 'Conectando…' : 'Conectar'}</Button>}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations()
  const deleteMutation = useDeleteIntegration()
  const syncMutation = useSyncIntegration()
  const [activeWizard, setActiveWizard] = useState<ProviderConfig | null>(null)

  const connectedTypes = new Set(integrations?.map(i => i.provider_type) ?? [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 4px', color: 'var(--text-1)' }}>Integraciones</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>Conectá tus cuentas financieras</p>
      </div>

      {/* Connected accounts */}
      {!isLoading && integrations && integrations.length > 0 && (
        <div>
          <span className="aa-overline" style={{ display: 'block', marginBottom: 10 }}>Cuentas conectadas ({integrations.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {integrations.map(item => {
              const cfg = PROVIDERS.find(p => p.value === item.provider_type)
              return (
                <Card key={item.id} padding="md">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: cfg?.color ?? 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-bold)', color: '#fff', flexShrink: 0 }}>
                        {(cfg?.label ?? item.provider_type).charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-1)', margin: 0 }}>{cfg?.label ?? item.provider_type}</p>
                          <span style={{ color: item.is_active ? 'var(--up)' : 'var(--down)' }}>
                            {item.is_active ? <CheckIcon /> : <XCircleIcon />}
                          </span>
                        </div>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>
                          {item.is_active
                            ? item.last_sync_at ? `Sync: ${new Date(item.last_sync_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Conectada'
                            : 'Inactiva'}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {item.provider_type !== 'balanz_csv' && item.provider_type !== 'manual' && (
                        <button onClick={() => syncMutation.mutate(item.id)} title="Sincronizar ahora"
                          style={{ padding: 7, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-accent)', display: 'flex' }}>
                          <RefreshIcon />
                        </button>
                      )}
                      <button onClick={() => deleteMutation.mutate(item.id)}
                        style={{ padding: 7, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--down)', display: 'flex' }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {item.last_error && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                      <span style={{ color: 'var(--down)', flexShrink: 0 }}><AlertIcon /></span>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--down)', margin: 0 }}>{item.last_error}</p>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />)}
        </div>
      )}

      {/* Add new */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="aa-overline">Agregar cuenta</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Hacé click en cualquier provider para conectar</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {PROVIDERS.map(p => (
            <ProviderPickerCard key={p.value} config={p} connected={connectedTypes.has(p.value)} onClick={() => setActiveWizard(p)} />
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          <ShieldIcon /> Todas las credenciales se cifran con AES-256 y nunca se almacenan en texto plano.
        </div>
      </div>

      {activeWizard && <WizardModal config={activeWizard} onClose={() => setActiveWizard(null)} onSuccess={() => setActiveWizard(null)} />}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
