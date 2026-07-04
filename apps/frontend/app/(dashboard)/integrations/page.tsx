'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import { Input } from '@/components/ds/Input'
import {
  useIntegrations, useAddIntegration, useDeleteIntegration,
  useSyncIntegration, useImportBalanzCSV, useImportBullMarketCSV,
  useUpdateIntegration, searchAssets, quoteAsset,
} from '@/hooks/usePortfolio'
import { api } from '@/lib/api'
import type { ProviderType, AssetSearchResult, AssetCategory } from '@/lib/types'

// ── Types & config ────────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder: string; secret?: boolean; note?: string }

type ProviderConfig = {
  value: ProviderType
  label: string
  tagline: string
  color: string
  type: 'fields' | 'csv' | 'manual'
  group: 'api' | 'manual'
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
    value: 'binance', label: 'Binance', tagline: 'Exchange de cripto mundial', color: '#E8C268', type: 'fields', group: 'api',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Tu Binance API Key' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'Solo visible al crear la clave', secret: true, note: 'El Secret solo se muestra UNA vez, al crear la clave. Si ya la creaste y no lo copiaste, no lo vas a poder ver de nuevo: generá una clave nueva.' },
    ],
    instructions: {
      description: 'Binance es el exchange de criptomonedas más grande del mundo. Conectamos usando una API Key de solo lectura.',
      steps: ['Iniciá sesión en binance.com', 'Perfil → Administración de API → Crear API', 'Elegí "Clave API generada por el sistema"', 'Activá solo "Habilitar lectura" — nunca transferencias ni retiros', 'Copiá la API Key y el Secret ANTES de cerrar (el Secret no se vuelve a mostrar)'],
      credentialUrl: 'https://www.binance.com/en/my/settings/api-management',
      credentialUrlLabel: 'Ir a Administración de API →',
      securityNote: 'Solo usamos permisos de lectura. Nunca podemos ejecutar retiros o transferencias.',
    },
  },
  {
    value: 'mercadopago', label: 'MercadoPago', tagline: 'Billetera digital argentina', color: '#63B8F4', type: 'fields', group: 'api',
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
    value: 'iol', label: 'InvertirOnline', tagline: 'Broker argentino (IOL)', color: '#9D8CFF', type: 'fields', group: 'api',
    fields: [{ key: 'username', label: 'Usuario', placeholder: 'Tu email de IOL' }, { key: 'password', label: 'Contraseña', placeholder: '••••••••', secret: true }],
    instructions: {
      description: 'InvertirOnline (IOL) es un broker argentino de acciones, bonos y FCI.',
      steps: ['Usamos las mismas credenciales de invertironline.com', 'Ingresá tu email y contraseña', 'Recomendamos no usar una cuenta compartida'],
      credentialUrl: 'https://invertironline.com', credentialUrlLabel: 'Ir a InvertirOnline →',
      securityNote: 'Tus credenciales se cifran con AES-256. Solo hacemos llamadas de lectura.',
    },
  },
  {
    value: 'bullmarket_csv', label: 'Bull Market', tagline: 'Importar portfolio via CSV', color: '#3DD993', type: 'csv', group: 'api',
    instructions: {
      description: 'Bull Market no tiene API pública estable. Importá tu portfolio exportando un CSV desde su plataforma web.',
      steps: [
        'Iniciá sesión en bullmarketbrokers.com',
        'Andá a "Mi Cartera" o "Posiciones"',
        'Buscá el botón "Exportar" o "Descargar CSV"',
        'Guardá el archivo .csv',
        'Subilo en el formulario de la siguiente pantalla',
      ],
      credentialUrl: 'https://bullmarketbrokers.com', credentialUrlLabel: 'Ir a Bull Market →',
      securityNote: 'El CSV solo contiene tus posiciones. No incluye datos de acceso ni contraseñas.',
    },
  },
  {
    value: 'lemoncash', label: 'Lemon Cash', tagline: 'Exchange cripto argentino', color: '#45D4C8', type: 'fields', group: 'api',
    fields: [{ key: 'api_key', label: 'API Key', placeholder: 'Tu Lemon Cash API Key', secret: true }],
    instructions: {
      description: 'Lemon Cash es un exchange de criptomonedas argentino.',
      steps: ['Abrí la app de Lemon Cash', 'Perfil → Configuración → API', 'Generá una nueva API Key', 'Copiá y pegá la key abajo'],
      securityNote: 'La API Key de Lemon solo permite leer tu saldo. No permite extracciones.',
    },
  },
  {
    value: 'onchain', label: 'Wallet EVM', tagline: 'Ethereum, Polygon o BSC', color: '#F08FB7', type: 'fields', group: 'api',
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
    value: 'solana', label: 'Wallet Solana', tagline: 'SOL + SPL tokens', color: '#B5D85A', type: 'fields', group: 'api',
    fields: [{ key: 'address', label: 'Dirección Solana', placeholder: 'Ej: 4Nd1mBQtrMJVYVfKf2PX98...' }],
    instructions: {
      description: 'Conectá una wallet Solana para ver SOL y tokens SPL.',
      steps: ['Abrí tu wallet (Phantom, Solflare, etc.)', 'Copiá tu dirección pública (32–44 caracteres base58)', 'Pegala abajo'],
      securityNote: 'Solo necesitamos la dirección pública. Sin claves privadas ni frases semilla.',
    },
  },
  {
    value: 'balanz_csv', label: 'Balanz', tagline: 'Importar portfolio via CSV', color: '#F4626E', type: 'csv', group: 'api',
    instructions: {
      description: 'Balanz no tiene API pública. Importá tu portfolio exportando un CSV desde su plataforma.',
      steps: ['Iniciá sesión en balanz.com', 'Mi Cuenta → Mi Cartera o Posiciones', 'Buscá "Exportar" o "Descargar CSV"', 'Guardá el archivo .csv', 'Subilo en el formulario de la siguiente pantalla'],
      credentialUrl: 'https://balanz.com', credentialUrlLabel: 'Ir a Balanz →',
      securityNote: 'El CSV solo contiene tus posiciones. No incluye datos de acceso.',
    },
  },
  {
    value: 'manual', label: 'Ingreso manual', tagline: 'Bull Market, Cocos, Naranja X, Ualá y más', color: '#8A97AB', type: 'manual', group: 'manual',
    instructions: {
      description: 'Para brokers sin API ni CSV (como Bull Market) o billeteras: buscá cada activo y cargá tu cantidad. Los precios de cripto, acciones y CEDEARs se actualizan solos.',
      steps: ['Ingresá el nombre de la institución (ej: Bull Market)', 'Buscá cada activo (BTC, AAPL, GGAL, USD…) y elegilo', 'Cargá la cantidad que tenés — el precio se actualiza automáticamente', 'Podés editar tus posiciones cuando quieras sin borrar la cuenta'],
      securityNote: 'Los valores se guardan cifrados en tu cuenta y solo son visibles para vos.',
    },
  },
]

type ManualHolding = {
  symbol: string
  name: string
  amount: string
  category: AssetCategory
  ref: string
  price_usd: number   // último precio USD conocido (fallback)
}

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  crypto: 'Cripto', stock: 'Acción', cedear: 'CEDEAR', bond: 'Bono', fx: 'Efectivo',
}

function fmtUsd(n: number): string {
  if (!n) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function XCircleIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> }
function RefreshIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function ChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function ChevLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function UploadIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function ExtLinkIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg> }

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

function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }

// ── Manual entry (buscador tipo TradingView + posiciones) ──────────────────────

function ManualEntry({ institutionName, setInstitutionName, holdings, setHoldings }: {
  institutionName: string
  setInstitutionName: (v: string) => void
  holdings: ManualHolding[]
  setHoldings: (updater: (arr: ManualHolding[]) => ManualHolding[]) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AssetSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

  // Buscar con debounce (todos los setState van dentro del timeout para no
  // disparar renders en cascada dentro del cuerpo del efecto).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      const clear = setTimeout(() => { setResults([]); setOpen(false); setSearching(false) }, 0)
      return () => clearTimeout(clear)
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchAssets(q)
        setResults(res)
        setOpen(true)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  async function selectAsset(a: AssetSearchResult) {
    setQuery('')
    setResults([])
    setOpen(false)
    if (holdings.some(h => h.ref === a.ref && h.category === a.category)) return
    // Cripto viene con precio 0 en la búsqueda → cotizar ahora
    let price = a.price_usd
    if (!price) {
      try { price = await quoteAsset(a.category, a.ref) } catch { price = 0 }
    }
    setHoldings(arr => [...arr, {
      symbol: a.symbol, name: a.name, amount: '', category: a.category, ref: a.ref, price_usd: price,
    }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Nombre de la institución" placeholder="Ej: Bull Market, Cocos Capital, Naranja X…" value={institutionName} onChange={e => setInstitutionName(e.target.value)} />

      <div style={{ position: 'relative' }}>
        <span className="aa-overline" style={{ display: 'block', marginBottom: 8 }}>Buscar activo</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--surface-inset)' }}>
          <span style={{ color: 'var(--text-3)', flexShrink: 0 }}><SearchIcon /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder="BTC, ETH, AAPL, GGAL, USD…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 'var(--text-sm)', padding: '10px 0' }}
          />
          {searching && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', flexShrink: 0 }}>…</span>}
        </div>

        {open && results.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 260, overflowY: 'auto', background: 'var(--surface-elevated)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}>
            {results.map((a) => (
              <button key={`${a.category}:${a.ref}`} onClick={() => selectAsset(a)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-1)', cursor: 'pointer' }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{a.symbol}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CATEGORY_LABEL[a.category]}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {holdings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="aa-overline">Tus posiciones</span>
          {holdings.map((h, idx) => {
            const value = (parseFloat(h.amount) || 0) * h.price_usd
            return (
              <div key={`${h.category}:${h.ref}:${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{h.symbol}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>{CATEGORY_LABEL[h.category]}</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                    {h.price_usd ? `${fmtUsd(h.price_usd)} c/u` : 'Precio manual'}
                    {value > 0 && ` · ${fmtUsd(value)}`}
                  </span>
                </div>
                <input
                  value={h.amount}
                  onChange={e => setHoldings(arr => arr.map((x, i) => i === idx ? { ...x, amount: e.target.value } : x))}
                  placeholder="Cantidad"
                  inputMode="decimal"
                  style={{ width: 96, border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-inset)', color: 'var(--text-1)', fontSize: 'var(--text-sm)', padding: '7px 10px', textAlign: 'right' }}
                />
                {h.category === 'fx' && h.ref === 'ARS' ? null : !h.price_usd && (
                  <input
                    value={h.price_usd ? String(h.price_usd) : ''}
                    onChange={e => setHoldings(arr => arr.map((x, i) => i === idx ? { ...x, price_usd: parseFloat(e.target.value) || 0 } : x))}
                    placeholder="US$"
                    inputMode="decimal"
                    title="Precio USD (solo si no se pudo cotizar automáticamente)"
                    style={{ width: 72, border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-inset)', color: 'var(--text-1)', fontSize: 'var(--text-sm)', padding: '7px 10px', textAlign: 'right' }}
                  />
                )}
                <button onClick={() => setHoldings(arr => arr.filter((_, i) => i !== idx))} title="Quitar"
                  style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--down)', display: 'flex', flexShrink: 0 }}>
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, background: 'rgba(99,184,244,0.08)', border: '1px solid rgba(99,184,244,0.25)', borderRadius: 'var(--radius-md)', padding: '9px 12px' }}>
        <span style={{ color: '#63B8F4', flexShrink: 0 }}><ShieldIcon /></span>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>
          Los precios de cripto, acciones y CEDEARs se actualizan automáticamente en cada sincronización. Solo cargá la cantidad.
        </p>
      </div>
    </div>
  )
}

// ── Wizard modal ──────────────────────────────────────────────────────────────

function WizardModal({ config, editId, initialManual, onClose, onSuccess }: {
  config: ProviderConfig
  editId?: string
  initialManual?: { institution_name: string; holdings: ManualHolding[] }
  onClose: () => void
  onSuccess: () => void
}) {
  const addMutation = useAddIntegration()
  const updateMutation = useUpdateIntegration()
  const importBalanzCSV = useImportBalanzCSV()
  const importBullMarketCSV = useImportBullMarketCSV()
  const fileRef = useRef<HTMLInputElement>(null)

  const isEdit = !!editId
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [institutionName, setInstitutionName] = useState(initialManual?.institution_name ?? '')
  const [manualHoldings, setManualHoldings] = useState<ManualHolding[]>(initialManual?.holdings ?? [])
  const [error, setError] = useState('')
  const isSubmitting = addMutation.isPending || updateMutation.isPending || importBalanzCSV.isPending || importBullMarketCSV.isPending

  async function handleConnect() {
    setError('')
    try {
      if (config.type === 'csv') {
        if (!csvFile) { setError('Seleccioná un archivo CSV.'); return }
        if (config.value === 'bullmarket_csv') {
          await importBullMarketCSV.mutateAsync(csvFile)
        } else {
          await importBalanzCSV.mutateAsync(csvFile)
        }
      } else if (config.type === 'manual') {
        if (!institutionName.trim()) { setError('Ingresá el nombre de la institución.'); return }
        const holdings = manualHoldings
          .filter(h => h.symbol.trim() && parseFloat(h.amount) > 0)
          .map(h => ({ symbol: h.symbol.toUpperCase(), name: h.name || h.symbol.toUpperCase(), amount: parseFloat(h.amount), category: h.category, ref: h.ref, price_usd: h.price_usd || 0 }))
        if (!holdings.length) { setError('Agregá al menos un activo con cantidad > 0.'); return }
        const creds = { institution_name: institutionName, holdings }
        if (isEdit) {
          await updateMutation.mutateAsync({ id: editId!, credentials: creds })
        } else {
          await addMutation.mutateAsync({ provider_type: 'manual', credentials: creds })
        }
      } else {
        const trimmed = Object.fromEntries(Object.entries(credentials).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]))
        await addMutation.mutateAsync({ provider_type: config.value, credentials: trimmed })
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
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)', margin: 0 }}>{isEdit ? 'Editar posiciones' : config.label}</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>{isEdit ? (initialManual?.institution_name || config.label) : config.tagline}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Step indicator */}
        {!isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--border-1)' }}>
            <StepDot n={1} active={step === 1} done={step === 2} label="Instrucciones" />
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            <StepDot n={2} active={step === 2} done={false} label="Conectar" />
          </div>
        )}

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
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Input label={field.label} type={field.secret ? 'password' : 'text'} placeholder={field.placeholder} value={credentials[field.key] ?? ''} onChange={e => setCredentials(c => ({ ...c, [field.key]: e.target.value }))} />
                  {field.note && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{field.note}</p>
                  )}
                </div>
              ))}

              {config.type === 'csv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
                    {config.value === 'bullmarket_csv' ? 'Subí el CSV exportado desde Bull Market.' : 'Subí el CSV exportado desde Balanz.'}
                  </p>
                  {config.value === 'bullmarket_csv' && (
                    <div style={{ display: 'flex', gap: 10, background: 'rgba(232,194,104,0.10)', border: '1px solid rgba(232,194,104,0.35)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                      <span style={{ color: '#E8C268', flexShrink: 0, marginTop: 1 }}><AlertIcon /></span>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>
                        <strong style={{ color: 'var(--text-1)' }}>Recordá:</strong> si comprás o vendés acciones en Bull Market, actualizá el CSV para mantener tu portfolio sincronizado.
                      </p>
                    </div>
                  )}
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
                <ManualEntry
                  institutionName={institutionName}
                  setInstitutionName={setInstitutionName}
                  holdings={manualHoldings}
                  setHoldings={setManualHoldings}
                />
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
          <button onClick={(step === 1 || isEdit) ? onClose : () => setStep(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevLeft />{(step === 1 || isEdit) ? 'Cancelar' : 'Volver'}
          </button>
          {step === 1 && !isEdit
            ? <Button onClick={() => setStep(2)} icon={<ChevRight />}>Siguiente</Button>
            : <Button onClick={handleConnect} disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : (isEdit ? 'Guardar' : 'Conectar')}</Button>}
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
  const [editWizard, setEditWizard] = useState<{ config: ProviderConfig; editId: string; initialManual: { institution_name: string; holdings: ManualHolding[] } } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const connectedTypes = new Set(integrations?.map(i => i.provider_type) ?? [])
  const manualConfig = PROVIDERS.find(p => p.value === 'manual')!
  const apiProviders = PROVIDERS.filter(p => p.group === 'api')
  const manualProviders = PROVIDERS.filter(p => p.group === 'manual')

  async function handleEditManual(integrationId: string) {
    try {
      const { data } = await api.get<{ institution_name: string; holdings: Array<{ symbol: string; name?: string; amount: number; category?: AssetCategory; ref?: string; price_usd?: number }> }>(`/api/v1/integrations/${integrationId}/manual`)
      const holdings: ManualHolding[] = (data.holdings ?? []).map(h => ({
        symbol: h.symbol,
        name: h.name ?? h.symbol,
        amount: String(h.amount ?? ''),
        category: (h.category as AssetCategory) ?? 'fx',
        ref: h.ref ?? h.symbol,
        price_usd: h.price_usd ?? 0,
      }))
      setEditWizard({ config: manualConfig, editId: integrationId, initialManual: { institution_name: data.institution_name, holdings } })
    } catch {
      // si falla, no abrimos el editor
    }
  }

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
                      {item.provider_type !== 'balanz_csv' && item.provider_type !== 'bullmarket_csv' && (
                        <button onClick={() => syncMutation.mutate(item.id)} title="Actualizar precios ahora"
                          style={{ padding: 7, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-accent)', display: 'flex' }}>
                          <RefreshIcon />
                        </button>
                      )}
                      {item.provider_type === 'manual' && (
                        <button onClick={() => handleEditManual(item.id)} title="Editar posiciones"
                          style={{ padding: 7, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}>
                          <EditIcon />
                        </button>
                      )}
                      <button onClick={() => setConfirmDeleteId(item.id)}
                        style={{ padding: 7, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--down)', display: 'flex' }}>
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {item.provider_type === 'bullmarket_csv' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8, background: 'rgba(232,194,104,0.08)', border: '1px solid rgba(232,194,104,0.3)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
                      <span style={{ color: '#E8C268', flexShrink: 0 }}><AlertIcon /></span>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>
                        Si comprás o vendés acciones, eliminá esta integración y volvé a importar el CSV actualizado.
                      </p>
                    </div>
                  )}
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

      {/* Add new — grupo API/CSV */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span className="aa-overline">Conectar por API o CSV</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Hacé click en cualquier provider para conectar</span>
        </div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 10px' }}>
          Exchanges, brokers y billeteras con API o exportación de CSV. Se sincronizan automáticamente.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {apiProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} connected={connectedTypes.has(p.value)} onClick={() => setActiveWizard(p)} />
          ))}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          <ShieldIcon /> Todas las credenciales se cifran con AES-256 y nunca se almacenan en texto plano.
        </div>
      </div>

      {/* Add new — grupo manual */}
      <div>
        <span className="aa-overline" style={{ display: 'block', marginBottom: 4 }}>Ingreso manual</span>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 10px' }}>
          Para brokers sin API ni CSV (como Bull Market). Buscá cada activo y cargá tu cantidad; los precios se actualizan solos.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {manualProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} connected={false} onClick={() => setActiveWizard(p)} />
          ))}
        </div>
      </div>

      {activeWizard && <WizardModal config={activeWizard} onClose={() => setActiveWizard(null)} onSuccess={() => setActiveWizard(null)} />}
      {editWizard && <WizardModal config={editWizard.config} editId={editWizard.editId} initialManual={editWizard.initialManual} onClose={() => setEditWizard(null)} onSuccess={() => setEditWizard(null)} />}

      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <Card padding="lg" raised style={{ width: '100%', maxWidth: 360 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 8px' }}>¿Eliminar integración?</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 20px' }}>
              Se eliminarán las credenciales almacenadas. Podés volver a conectar cuando quieras.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button
                variant="danger"
                onClick={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null) }}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <style>{`@keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }`}</style>
    </div>
  )
}
