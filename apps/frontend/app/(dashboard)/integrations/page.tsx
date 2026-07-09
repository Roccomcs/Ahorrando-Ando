'use client'

import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import {
  useIntegrations, useAddIntegration, useDeleteIntegration,
  useSyncIntegration, useImportIOL, useManualHoldings,
  useUpdateIntegration, searchAssets, quoteAsset, usePortfolio,
} from '@/hooks/usePortfolio'
import { useCurrency } from '@/lib/currency-context'
import type { ProviderType, AssetSearchResult, AssetCategory, IntegrationSummaryDTO } from '@/lib/types'

// ── Types & config ────────────────────────────────────────────────────────────

type FieldDef = { key: string; label: string; placeholder: string; secret?: boolean; note?: string }

type ProviderConfig = {
  value: ProviderType
  label: string
  tagline: string
  color: string
  logoUrl?: string
  type: 'fields' | 'csv' | 'manual'
  group: 'api' | 'manual'
  accept?: string
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
    value: 'binance', label: 'Binance', tagline: 'Exchange de cripto mundial', color: '#E8C268', logoUrl: 'https://icons.duckduckgo.com/ip3/binance.com.ico', type: 'fields', group: 'api',
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
    value: 'mercadopago', label: 'MercadoPago', tagline: 'Billetera digital argentina', color: '#63B8F4', logoUrl: 'https://icons.duckduckgo.com/ip3/mercadopago.com.ar.ico', type: 'fields', group: 'api',
    fields: [{ key: 'access_token', label: 'Access Token', placeholder: 'APP_USR-...', secret: true, note: 'Es la única forma oficial de leer tu saldo. El token es de solo lectura: no permite mover dinero.' }],
    instructions: {
      description: 'MercadoPago solo permite leer el saldo con un Access Token de producción. Para obtenerlo hay que crear una aplicación (es gratis y toma 2 minutos).',
      steps: [
        'Entrá a mercadopago.com.ar/developers e iniciá sesión',
        'Andá a "Tus integraciones" → "Crear aplicación"',
        'Poné cualquier nombre y elegí el modelo "Pagos online" (o el que aparezca)',
        'Abrí la aplicación creada → sección "Credenciales de producción"',
        'Copiá el "Access Token" (empieza con APP_USR-) y pegalo abajo',
      ],
      credentialUrl: 'https://www.mercadopago.com.ar/developers/panel/app',
      credentialUrlLabel: 'Ir a Tus integraciones →',
      securityNote: 'El access token permite leer tu saldo. No permite mover dinero.',
    },
  },
  {
    value: 'iol', label: 'InvertirOnline', tagline: 'Broker argentino (IOL)', color: '#9D8CFF', logoUrl: 'https://icons.duckduckgo.com/ip3/invertironline.com.ico', type: 'csv', group: 'api', accept: '.xls,.xlsx,.csv,.html,.htm',
    instructions: {
      description: 'IOL no ofrece conexión automática para terceros: la API se solicita por mensaje al soporte de IOL. Mientras tanto, importá tu cartera desde el archivo de operaciones que podés descargar de tu cuenta.',
      steps: [
        'Iniciá sesión en invertironline.com',
        'Andá a "Mi Cuenta" → "Operaciones" → "Operaciones Finalizadas"',
        'Elegí el período (desde el inicio) y tocá "Buscar"',
        'Descargá el archivo con el botón de exportar (baja un .xls)',
        'Subí ese archivo acá — calculamos tu tenencia actual (compras − ventas)',
      ],
      credentialUrl: 'https://invertironline.com', credentialUrlLabel: 'Ir a InvertirOnline →',
      securityNote: 'El archivo solo contiene tus operaciones. No incluye usuario ni contraseña.',
    },
  },
  {
    value: 'manual', label: 'Ingreso manual', tagline: 'Bull Market, Cocos, Naranja X, Ualá y más', color: '#8A97AB', type: 'manual', group: 'manual',
    instructions: {
      description: 'Para brokers o billeteras sin API ni archivo: buscá cada activo y cargá tu cantidad. Los precios de cripto, acciones y CEDEARs se actualizan solos.',
      steps: ['Buscá cada activo (BTC, AAPL, GGAL, USD…) y elegilo', 'Cargá la cantidad que tenés — el precio se actualiza automáticamente', 'Podés editar tus posiciones cuando quieras sin borrar la cuenta'],
      securityNote: 'Los valores se guardan cifrados en tu cuenta y solo son visibles para vos.',
    },
  },
]

// Config para renderizar cuentas ya conectadas (incluye tipos que no se eligen
// directamente, como iol_csv que nace del import de IOL).
function configFor(providerType: string): ProviderConfig | undefined {
  if (providerType === 'iol_csv') return PROVIDERS.find(p => p.value === 'iol')
  return PROVIDERS.find(p => p.value === providerType)
}

// Cuentas que se muestran expandidas en una fila por activo.
const ASSET_ROW_TYPES = new Set(['manual', 'iol_csv'])

type ManualHolding = {
  symbol: string
  name: string
  amount: string
  category: AssetCategory
  ref: string
  price_usd: number   // último precio USD conocido (fallback)
  logo_url?: string | null
}

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  crypto: 'Cripto', stock: 'Acción', cedear: 'CEDEAR', bond: 'Bono', fx: 'Efectivo',
}

const CATEGORY_COLOR: Record<AssetCategory, string> = {
  crypto: '#E8C268', stock: '#63B8F4', cedear: '#9D8CFF', bond: '#3DD993', fx: '#8A97AB',
}

function fmtUsd(n: number): string {
  if (!n) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function RefreshIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function ChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function ChevLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function UploadIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function ExtLinkIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg> }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }

// ── AssetAvatar (logo del activo o monograma) ──────────────────────────────────

function AssetAvatar({ logoUrl, symbol, category, size = 32 }: { logoUrl?: string | null; symbol: string; category?: AssetCategory; size?: number }) {
  const [failed, setFailed] = useState(false)
  const color = category ? CATEGORY_COLOR[category] : 'var(--text-3)'
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={symbol} width={size} height={size} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: 'var(--surface-inset)' }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${color} 16%, transparent)`, color, fontFamily: 'var(--font-mono)', fontSize: size <= 28 ? 9 : 11, fontWeight: 700 }}>
      {symbol.slice(0, 4).toUpperCase()}
    </div>
  )
}

// ── ProviderLogo (logo de marca o monograma) ───────────────────────────────────

function ProviderLogo({ logoUrl, label, color, size = 36, radius = 'var(--radius-md)', mono = 1 }: { logoUrl?: string; label: string; color: string; size?: number; radius?: string; mono?: number }) {
  const [failed, setFailed] = useState(false)
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={label} width={size} height={size} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: Math.round(size * 0.14) }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: mono === 1 ? color : `color-mix(in srgb, ${color} 16%, transparent)`, color: mono === 1 ? '#fff' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size <= 36 ? 'var(--text-sm)' : 'var(--text-base)', fontWeight: 'var(--weight-bold)', flexShrink: 0, fontFamily: mono === 1 ? undefined : 'var(--font-mono)' }}>
      {mono === 1 ? label.charAt(0) : label.slice(0, 3).toUpperCase()}
    </div>
  )
}

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
        <ProviderLogo logoUrl={config.logoUrl} label={config.label} color={config.color} size={36} />
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

// ── Manual entry (buscador tipo TradingView + posiciones) ──────────────────────

function ManualEntry({ holdings, setHoldings }: {
  holdings: ManualHolding[]
  setHoldings: (updater: (arr: ManualHolding[]) => ManualHolding[]) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AssetSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

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
    let price = a.price_usd
    if (!price) {
      try { price = await quoteAsset(a.category, a.ref) } catch { price = 0 }
    }
    setHoldings(arr => [...arr, {
      symbol: a.symbol, name: a.name, amount: '', category: a.category, ref: a.ref, price_usd: price, logo_url: a.logo_url ?? null,
    }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: 4, maxHeight: 300, overflowY: 'auto', background: 'var(--surface-elevated)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)' }}>
            {results.map((a) => (
              <button key={`${a.category}:${a.ref}`} onClick={() => selectAsset(a)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-1)', cursor: 'pointer' }}>
                <AssetAvatar logoUrl={a.logo_url} symbol={a.symbol} category={a.category} size={28} />
                <div style={{ minWidth: 0, flex: 1 }}>
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
                <AssetAvatar logoUrl={h.logo_url} symbol={h.symbol} category={h.category} size={32} />
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
  initialManual?: { holdings: ManualHolding[] }
  onClose: () => void
  onSuccess: () => void
}) {
  const addMutation = useAddIntegration()
  const updateMutation = useUpdateIntegration()
  const importIOL = useImportIOL()
  const fileRef = useRef<HTMLInputElement>(null)

  const isEdit = !!editId
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualHoldings, setManualHoldings] = useState<ManualHolding[]>(initialManual?.holdings ?? [])
  const [error, setError] = useState('')
  const isSubmitting = addMutation.isPending || updateMutation.isPending || importIOL.isPending

  async function handleConnect() {
    setError('')
    try {
      if (config.type === 'csv') {
        if (!csvFile) { setError('Seleccioná el archivo exportado.'); return }
        await importIOL.mutateAsync(csvFile)
      } else if (config.type === 'manual') {
        const holdings = manualHoldings
          .filter(h => h.symbol.trim() && parseFloat(h.amount) > 0)
          .map(h => ({ symbol: h.symbol.toUpperCase(), name: h.name || h.symbol.toUpperCase(), amount: parseFloat(h.amount), category: h.category, ref: h.ref, price_usd: h.price_usd || 0, logo_url: h.logo_url ?? null }))
        if (!holdings.length) { setError('Agregá al menos un activo con cantidad > 0.'); return }
        const creds = { institution_name: 'Manual', holdings }
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
          <ProviderLogo logoUrl={config.logoUrl} label={config.label} color={config.color} size={40} radius="var(--radius-lg)" />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)', margin: 0 }}>{isEdit ? 'Editar posiciones' : config.label}</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>{isEdit ? 'Ajustá cantidades o quitá activos' : config.tagline}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {/* Step indicator */}
        {!isEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--border-1)' }}>
            <StepDot n={1} active={step === 1} done={step === 2} label="Instrucciones" />
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            <StepDot n={2} active={step === 2} done={false} label={config.type === 'manual' ? 'Cargar' : config.type === 'csv' ? 'Importar' : 'Conectar'} />
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
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="aa-overline">{field.label}</span>
                    <input type={field.secret ? 'password' : 'text'} placeholder={field.placeholder} value={credentials[field.key] ?? ''}
                      onChange={e => setCredentials(c => ({ ...c, [field.key]: e.target.value }))}
                      style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', background: 'var(--surface-inset)', color: 'var(--text-1)', fontSize: 'var(--text-sm)', padding: '10px 12px' }} />
                  </label>
                  {field.note && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{field.note}</p>
                  )}
                </div>
              ))}

              {config.type === 'csv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
                    Subí el archivo de operaciones que descargaste de IOL. Calculamos tu tenencia actual (compras − ventas).
                  </p>
                  <div onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-2)', padding: 28, cursor: 'pointer', transition: 'border-color var(--dur-fast) var(--ease-out)' }}>
                    <span style={{ color: 'var(--text-3)' }}><UploadIcon /></span>
                    {csvFile
                      ? <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-accent)', margin: 0 }}>{csvFile.name}</p>
                      : <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>Hacé click para seleccionar el archivo (.xls)</p>}
                  </div>
                  <input ref={fileRef} type="file" accept={config.accept ?? '.csv'} style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                  <div style={{ display: 'flex', gap: 8, background: 'rgba(157,140,255,0.08)', border: '1px solid rgba(157,140,255,0.28)', borderRadius: 'var(--radius-md)', padding: '9px 12px' }}>
                    <span style={{ color: '#9D8CFF', flexShrink: 0, marginTop: 1 }}><AlertIcon /></span>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', margin: 0 }}>
                      Si operás seguido, volvé a importar el archivo actualizado para reflejar tu cartera actual.
                    </p>
                  </div>
                </div>
              )}

              {config.type === 'manual' && (
                <ManualEntry holdings={manualHoldings} setHoldings={setManualHoldings} />
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
            : <Button onClick={handleConnect} disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : (isEdit ? 'Guardar' : config.type === 'csv' ? 'Importar' : 'Conectar')}</Button>}
        </div>
      </div>
    </div>
  )
}

// ── Connected account (una fila por activo para manual / iol_csv) ───────────────

function AssetRowsAccount({ item, onEdit, onRemove }: {
  item: IntegrationSummaryDTO
  onEdit: (id: string) => void
  onRemove: (id: string) => void
}) {
  const cfg = configFor(item.provider_type)
  const { format } = useCurrency()
  const { data: portfolio } = usePortfolio()
  const rate = portfolio?.usd_to_ars ?? undefined
  const { data, isLoading } = useManualHoldings(item.id, true)
  const syncMutation = useSyncIntegration()
  const holdings = data?.holdings ?? []
  const editable = data?.editable ?? (item.provider_type === 'manual')

  return (
    <div style={{ borderBottom: '1px solid var(--border-1)', padding: '15px 0' }}>
      {/* group header (sutil) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: holdings.length ? 10 : 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.is_active ? 'var(--positive)' : 'var(--negative)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{cfg?.label ?? item.provider_type}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {holdings.length} {holdings.length === 1 ? 'activo' : 'activos'}</span>
        <div style={{ flex: 1 }} />
        {item.provider_type === 'manual' && (
          <button onClick={() => syncMutation.mutate(item.id)} title="Sincronizar precios"
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            <RefreshIcon /> Sincronizar
          </button>
        )}
        <button onClick={() => onRemove(item.id)} title="Quitar cuenta"
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
          Quitar
        </button>
      </div>

      {isLoading && <div style={{ height: 44, borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {holdings.map((h, i) => {
          const price = h.price_usd ?? 0
          const value = (h.amount ?? 0) * price
          const category = (h.category as AssetCategory) ?? 'fx'
          return (
            <div key={`${h.ref ?? h.symbol}:${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)' }}>
              <AssetAvatar logoUrl={h.logo_url} symbol={h.symbol} category={category} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{h.symbol}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name || h.symbol}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{format(value, rate)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{h.amount} u.</div>
              </div>
              {editable && (
                <button onClick={() => onEdit(item.id)} title="Editar posiciones"
                  style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-inset)', border: '1px solid var(--border-1)', color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0, transition: 'all var(--dur-fast) var(--ease-out)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-1)' }}>
                  <EditIcon />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ApiAccount({ item, balance, rate, format, onRemove }: {
  item: IntegrationSummaryDTO
  balance: number | undefined
  rate: number | undefined
  format: (n: number, rate?: number) => string
  onRemove: (id: string) => void
}) {
  const cfg = configFor(item.provider_type)
  const syncMutation = useSyncIntegration()
  const [now] = useState(() => Date.now())
  const syncAgo = item.last_sync_at
    ? `hace ${Math.max(1, Math.round((now - new Date(item.last_sync_at).getTime()) / 60000))} min`
    : 'conectada'
  return (
    <div style={{ borderBottom: '1px solid var(--border-1)', padding: '15px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ProviderLogo logoUrl={cfg?.logoUrl} label={cfg?.label ?? item.provider_type} color={cfg?.color ?? '#8A97AB'} size={38} radius="11px" mono={0} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{cfg?.label ?? item.provider_type}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{cfg?.tagline}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.is_active ? 'var(--positive)' : 'var(--negative)' }} />
          <span style={{ fontSize: 12, color: item.is_active ? 'var(--positive)' : 'var(--negative)' }}>{item.is_active ? syncAgo : 'inactiva'}</span>
        </div>
        {typeof balance === 'number' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', minWidth: 110, textAlign: 'right', flexShrink: 0 }}>
            {format(balance, rate)}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Button variant="secondary" size="sm" style={{ height: 34, padding: '0 16px', fontSize: 13 }} onClick={() => syncMutation.mutate(item.id)}>
            Sincronizar
          </Button>
          <button onClick={() => onRemove(item.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            Quitar
          </button>
        </div>
      </div>
      {item.last_error && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '8px 12px' }}>
          <span style={{ color: 'var(--down)', flexShrink: 0 }}><AlertIcon /></span>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--down)', margin: 0 }}>{item.last_error}</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useIntegrations()
  const { data: portfolio } = usePortfolio()
  const { format } = useCurrency()
  const deleteMutation = useDeleteIntegration()
  const balanceByProvider = new Map((portfolio?.providers ?? []).map(p => [p.provider, p.balance_usd]))
  const rate = portfolio?.usd_to_ars ?? undefined
  const [activeWizard, setActiveWizard] = useState<ProviderConfig | null>(null)
  const [editWizard, setEditWizard] = useState<{ config: ProviderConfig; editId: string; initialManual: { holdings: ManualHolding[] } } | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const connectedTypes = new Set(integrations?.map(i => i.provider_type) ?? [])
  const manualConfig = PROVIDERS.find(p => p.value === 'manual')!
  const apiProviders = PROVIDERS.filter(p => p.group === 'api')
  const manualProviders = PROVIDERS.filter(p => p.group === 'manual')

  async function handleEditManual(integrationId: string) {
    try {
      const { api } = await import('@/lib/api')
      const { data } = await api.get<{ holdings: Array<{ symbol: string; name?: string; amount: number; category?: AssetCategory; ref?: string; price_usd?: number; logo_url?: string | null }> }>(`/api/v1/integrations/${integrationId}/manual`)
      const holdings: ManualHolding[] = (data.holdings ?? []).map(h => ({
        symbol: h.symbol,
        name: h.name ?? h.symbol,
        amount: String(h.amount ?? ''),
        category: (h.category as AssetCategory) ?? 'fx',
        ref: h.ref ?? h.symbol,
        price_usd: h.price_usd ?? 0,
        logo_url: h.logo_url ?? null,
      }))
      setEditWizard({ config: manualConfig, editId: integrationId, initialManual: { holdings } })
    } catch {
      // si falla, no abrimos el editor
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="aa-sec aa-sec--1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Integraciones</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '6px 0 6px', color: 'var(--text-1)' }}>
          Conectá lo que ya usás
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0, maxWidth: 460 }}>
          Claves API de solo lectura, cifradas con AES-256. Leemos saldos; nunca movemos tu plata.
        </p>
      </div>

      {/* Connected accounts */}
      {!isLoading && integrations && integrations.length > 0 && (
        <section className="aa-sec aa-sec--2">
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            Conectadas · {integrations.length}
          </span>
          <div>
            {integrations.map(item => (
              ASSET_ROW_TYPES.has(item.provider_type)
                ? <AssetRowsAccount key={item.id} item={item} onEdit={handleEditManual} onRemove={setConfirmDeleteId} />
                : <ApiAccount key={item.id} item={item} balance={balanceByProvider.get(item.provider_type)} rate={rate} format={format} onRemove={setConfirmDeleteId} />
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />)}
        </div>
      )}

      {/* Add new — grupo API */}
      <section className="aa-sec aa-sec--3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Conectar por API o archivo</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Elegí un proveedor</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {apiProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} connected={connectedTypes.has(p.value) || (p.value === 'iol' && connectedTypes.has('iol_csv'))} onClick={() => setActiveWizard(p)} />
          ))}
        </div>
      </section>

      {/* Add new — grupo manual */}
      <section className="aa-sec aa-sec--4">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Ingreso manual</span>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '0 0 12px' }}>
          Para brokers o billeteras sin API ni archivo. Buscá cada activo y cargá tu cantidad; los precios se actualizan solos.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {manualProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} connected={false} onClick={() => setActiveWizard(p)} />
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          <ShieldIcon /> Todas las credenciales se cifran con AES-256 y nunca se almacenan en texto plano.
        </div>
      </section>

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
