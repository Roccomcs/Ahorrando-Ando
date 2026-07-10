'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card } from '@/components/ds/Card'
import { Button } from '@/components/ds/Button'
import {
  useIntegrations, useAddIntegration, useDeleteIntegration,
  useSyncIntegration, useImportIOL, useAssetLogo,
  useUpdateIntegration, searchAssets, quoteAsset, usePortfolio,
} from '@/hooks/usePortfolio'
import { useCurrency } from '@/lib/currency-context'
import type { ProviderType, AssetSearchResult, AssetCategory, HoldingDTO } from '@/lib/types'

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
    value: 'iol', label: 'InvertirOnline', tagline: 'Broker argentino (IOL)', color: '#9D8CFF', logoUrl: 'https://icons.duckduckgo.com/ip3/invertironline.com.ico', type: 'csv', group: 'api', accept: '.xls,.xlsx,.csv,.html,.htm',
    instructions: {
      description: 'IOL no ofrece conexión automática para terceros: la API se solicita por mensaje al soporte de IOL. Mientras tanto, importá tu cartera desde el archivo de operaciones que podés descargar de tu cuenta.',
      steps: [
        'Iniciá sesión en invertironline.com',
        'Andá a "Mi Cuenta" → "Operaciones" → "Operaciones Finalizadas"',
        'Elegí el período (desde el inicio) y tocá "Buscar"',
        'Descargá el archivo con el botón de exportar (baja un .xls)',
        'Subí ese archivo acá — calculamos tu tenencia actual (compras − ventas)',
        'Si operaste después, borrá la conexión y volvé a importar el archivo actualizado',
      ],
      credentialUrl: 'https://invertironline.com', credentialUrlLabel: 'Ir a InvertirOnline →',
      securityNote: 'El archivo solo contiene tus operaciones. No incluye usuario ni contraseña.',
    },
  },
  {
    value: 'manual', label: 'Ingreso manual', tagline: 'Cargá tus activos o tu efectivo', color: '#8A97AB', type: 'manual', group: 'manual',
    instructions: { description: '', steps: [], securityNote: 'Los valores se guardan cifrados en tu cuenta y solo son visibles para vos.' },
  },
]

type ManualHolding = {
  symbol: string
  name: string
  amount: string
  category: AssetCategory
  ref: string
  price_usd: number
  logo_url?: string | null
}

const MONEY_OPTIONS: { code: string; label: string; category: AssetCategory; ref: string; name: string }[] = [
  { code: 'ARS', label: 'Pesos', category: 'fx', ref: 'ARS', name: 'Pesos argentinos' },
  { code: 'USD', label: 'Dólares', category: 'fx', ref: 'USD', name: 'Dólares' },
  { code: 'EUR', label: 'Euros', category: 'fx', ref: 'EUR', name: 'Euros' },
  { code: 'USDT', label: 'USDT', category: 'crypto', ref: 'tether', name: 'Tether (USDT)' },
]

const CATEGORY_LABEL: Record<AssetCategory, string> = {
  crypto: 'Cripto', stock: 'Acción', cedear: 'CEDEAR', bond: 'Bono', fx: 'Efectivo',
}
const CATEGORY_COLOR: Record<AssetCategory, string> = {
  crypto: '#E8C268', stock: '#63B8F4', cedear: '#9D8CFF', bond: '#3DD993', fx: '#8A97AB',
}

// Banderas para el efectivo (los emoji de bandera no renderizan en Windows).
const FX_FLAGS: Record<string, string> = {
  ARS: 'https://flagcdn.com/w80/ar.png',
  USD: 'https://flagcdn.com/w80/us.png',
  EUR: 'https://flagcdn.com/w80/eu.png',
}
function fxFlag(ref?: string | null): string | null {
  return ref ? FX_FLAGS[ref.toUpperCase()] ?? null : null
}

function fmtUsd(n: number): string {
  if (!n) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 })
}
function formatUnits(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('es-AR')
  return n.toLocaleString('es-AR', { maximumFractionDigits: n < 1 ? 6 : 4 })
}
function stepFor(h: { category: AssetCategory; ref: string }): number {
  if (h.category === 'fx') return h.ref === 'ARS' ? 1000 : 10
  return 1
}
function decimalsFor(h: { category: AssetCategory }): boolean {
  return h.category === 'crypto' || h.category === 'fx'
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckIcon({ s = 16 }: { s?: number }) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg> }
function RefreshIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> }
function EditIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function ChevRight() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg> }
function ChevLeft() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg> }
function ShieldIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> }
function UploadIcon() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg> }
function AlertIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function ExtLinkIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg> }
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> }
function XIcon({ s = 14 }: { s?: number }) { return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }

// ── Avatars ───────────────────────────────────────────────────────────────────

/** Logo del activo. El backend ya no bloquea el portfolio resolviendo logos: acá
 *  se piden por símbolo (cacheados) y se muestra un skeleton mientras cargan. */
function AssetAvatar({ logoUrl, symbol, category, size = 36 }: { logoUrl?: string | null; symbol: string; category?: AssetCategory | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const flag = category === 'fx' ? fxFlag(symbol) : null
  const { logoUrl: resolved, isLoading } = useAssetLogo(symbol, category ?? null, logoUrl ?? flag ?? null)
  const color = category ? CATEGORY_COLOR[category] : 'var(--text-3)'

  if (isLoading) {
    return <div className="aa-skel-circle" style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }} />
  }
  if (resolved && !failed) {
    const isFlag = !!flag
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved} alt={symbol} width={size} height={size} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: isFlag ? 'transparent' : 'var(--surface-inset)' }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${color} 16%, transparent)`, color, fontFamily: 'var(--font-mono)', fontSize: size <= 28 ? 9 : 11, fontWeight: 700 }}>
      {symbol.slice(0, 4).toUpperCase()}
    </div>
  )
}

function ProviderLogo({ logoUrl, label, color, size = 36, radius = 'var(--radius-md)' }: { logoUrl?: string; label: string; color: string; size?: number; radius?: string }) {
  const [failed, setFailed] = useState(false)
  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={label} width={size} height={size} onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'contain', flexShrink: 0, background: '#fff', padding: Math.round(size * 0.14) }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size <= 24 ? 10 : 'var(--text-sm)', fontWeight: 'var(--weight-bold)', flexShrink: 0 }}>
      {label.charAt(0)}
    </div>
  )
}

// ── Stepper (− valor +) ───────────────────────────────────────────────────────

function Stepper({ value, onChange, step = 1, decimals = false, disabled = false, width = 132 }: { value: string; onChange: (v: string) => void; step?: number; decimals?: boolean; disabled?: boolean; width?: number }) {
  const num = parseFloat(value) || 0
  const commit = (n: number) => {
    const clamped = Math.max(0, n)
    onChange(decimals ? String(Math.round(clamped * 1e8) / 1e8) : String(Math.round(clamped)))
  }
  const btn = (label: string, on: () => void) => (
    <button type="button" onClick={on} disabled={disabled}
      style={{ width: 32, height: 34, border: 'none', background: 'transparent', color: disabled ? 'var(--text-3)' : 'var(--text-2)', fontSize: 18, fontWeight: 600, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', width, border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', background: disabled ? 'var(--surface-card)' : 'var(--surface-inset)', opacity: disabled ? 0.6 : 1, flexShrink: 0 }}>
      {btn('−', () => commit(num - step))}
      <input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal" disabled={disabled} placeholder="0" aria-label="Cantidad"
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', textAlign: 'center', padding: '8px 0' }} />
      {btn('+', () => commit(num + step))}
    </div>
  )
}

// ── ProviderPicker card (con acciones si ya está conectado) ────────────────────

function ProviderPickerCard({ config, connectedId, onClick, onRemove }: { config: ProviderConfig; connectedId?: string; onClick: () => void; onRemove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const syncMutation = useSyncIntegration()
  const connected = !!connectedId

  return (
    <div
      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid', padding: 14, background: connected ? 'rgba(61,217,147,0.04)' : hovered ? 'var(--surface-hover)' : 'var(--surface-card)', borderColor: connected ? 'rgba(61,217,147,0.25)' : hovered ? 'var(--border-2)' : 'var(--border-1)', transition: 'all var(--dur-fast) var(--ease-out)', cursor: connected ? 'default' : 'pointer' }}
      onClick={connected ? undefined : onClick}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ProviderLogo logoUrl={config.logoUrl} label={config.label} color={config.color} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: 0 }}>{config.label}</p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {connected ? 'Conectada' : config.tagline}
          </p>
        </div>
        {!connected && <span style={{ flexShrink: 0, color: 'var(--text-3)' }}><ChevRight /></span>}
        {connected && <span style={{ flexShrink: 0, color: 'var(--up)' }}><CheckIcon /></span>}
      </div>

      {connected && (
        <div style={{ display: 'flex', gap: 6, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
          <button onClick={() => syncMutation.mutate(connectedId!)} disabled={syncMutation.isPending}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, padding: '7px 10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'var(--surface-inset)', color: 'var(--text-2)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            <RefreshIcon /> {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <button onClick={() => onRemove(connectedId!)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-1)', background: 'transparent', color: 'var(--text-3)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--negative)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            <TrashIcon /> Borrar
          </button>
        </div>
      )}
    </div>
  )
}

// ── Manual entry (activo / dinero) ────────────────────────────────────────────

function ManualEntry({ holdings, setHoldings }: {
  holdings: ManualHolding[]
  setHoldings: (updater: (arr: ManualHolding[]) => ManualHolding[]) => void
}) {
  const [mode, setMode] = useState<'asset' | 'money'>('asset')
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
      try { setResults(await searchAssets(q)); setOpen(true) } catch { setResults([]) } finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [query])

  async function selectAsset(a: AssetSearchResult) {
    setQuery(''); setResults([]); setOpen(false)
    if (holdings.some(h => h.ref === a.ref && h.category === a.category)) return
    let price = a.price_usd
    if (!price) { try { price = await quoteAsset(a.category, a.ref) } catch { price = 0 } }
    setHoldings(arr => [...arr, { symbol: a.symbol, name: a.name, amount: '1', category: a.category, ref: a.ref, price_usd: price, logo_url: a.logo_url ?? null }])
  }

  /** Los chips de moneda son toggle: si ya está cargada, se quita. */
  function toggleMoney(opt: typeof MONEY_OPTIONS[number]) {
    const exists = holdings.some(h => h.ref === opt.ref && h.category === opt.category)
    if (exists) {
      setHoldings(arr => arr.filter(h => !(h.ref === opt.ref && h.category === opt.category)))
      return
    }
    setHoldings(arr => [...arr, {
      symbol: opt.code, name: opt.name, amount: '', category: opt.category, ref: opt.ref,
      price_usd: opt.ref === 'USD' ? 1 : 0, logo_url: null,
    }])
  }

  const seg = (m: 'asset' | 'money', label: string) => (
    <button type="button" onClick={() => setMode(m)}
      style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', background: mode === m ? 'var(--surface-card)' : 'transparent', color: mode === m ? 'var(--text-1)' : 'var(--text-3)', boxShadow: mode === m ? 'var(--shadow-sm)' : 'none', transition: 'all var(--dur-fast) var(--ease-out)' }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--surface-inset)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-1)' }}>
        {seg('asset', 'Ingresar activo')}
        {seg('money', 'Ingreso de dinero')}
      </div>

      {mode === 'asset' && (
        <div style={{ position: 'relative' }}>
          <span className="aa-overline" style={{ display: 'block', marginBottom: 8 }}>Buscar activo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)', padding: '0 12px', background: 'var(--surface-inset)' }}>
            <span style={{ color: 'var(--text-3)', flexShrink: 0 }}><SearchIcon /></span>
            <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)}
              placeholder="BTC, ETH, AAPL, GGAL…" type="search" aria-label="Buscar activo"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text-1)', fontSize: 'var(--text-sm)', padding: '10px 0' }} />
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
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', marginLeft: 8 }}>{a.name}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{CATEGORY_LABEL[a.category]}</span>
                </button>
              ))}
            </div>
          )}

          {holdings.length === 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="aa-overline" style={{ display: 'block', marginBottom: 8 }}>Cantidad</span>
              <Stepper value="" onChange={() => {}} disabled width={160} />
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: '6px 0 0' }}>Elegí un activo para cargar la cantidad.</p>
            </div>
          )}
        </div>
      )}

      {mode === 'money' && (
        <div>
          <span className="aa-overline" style={{ display: 'block', marginBottom: 8 }}>Elegí la moneda</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MONEY_OPTIONS.map(opt => {
              const added = holdings.some(h => h.ref === opt.ref && h.category === opt.category)
              return (
                <button key={opt.code} type="button" onClick={() => toggleMoney(opt)}
                  title={added ? 'Tocá para quitar' : 'Tocá para agregar'}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: added ? 'rgba(61,217,147,0.45)' : 'var(--border-2)', background: added ? 'rgba(61,217,147,0.08)' : 'var(--surface-card)', color: 'var(--text-1)', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', transform: added ? 'scale(1.02)' : 'scale(1)', transition: 'all 180ms var(--ease-out)' }}>
                  <AssetAvatar symbol={opt.code} category={opt.category} size={20} />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{opt.code}</span>
                  <span style={{ color: 'var(--text-3)', fontWeight: 'var(--weight-regular)', fontSize: 'var(--text-xs)' }}>{opt.label}</span>
                  {added && <span style={{ color: 'var(--up)', display: 'flex', animation: 'aa-pop 220ms var(--ease-out)' }}><CheckIcon s={15} /></span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {holdings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="aa-overline">Tus posiciones</span>
          {holdings.map((h, idx) => {
            const value = (parseFloat(h.amount) || 0) * h.price_usd
            return (
              <div key={`${h.category}:${h.ref}:${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card)', animation: 'aa-pop 200ms var(--ease-out)' }}>
                <AssetAvatar logoUrl={h.logo_url} symbol={h.symbol} category={h.category} size={34} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)' }}>{h.symbol}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>{CATEGORY_LABEL[h.category]}</span>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                    {h.price_usd ? `${fmtUsd(h.price_usd)} c/u` : 'Se cotiza al sincronizar'}
                    {value > 0 && ` · ${fmtUsd(value)}`}
                  </span>
                </div>
                <Stepper value={h.amount} step={stepFor(h)} decimals={decimalsFor(h)}
                  onChange={v => setHoldings(arr => arr.map((x, i) => i === idx ? { ...x, amount: v } : x))} />
                <button onClick={() => setHoldings(arr => arr.filter((_, i) => i !== idx))} title="Quitar"
                  style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--down)', display: 'flex', flexShrink: 0 }}>
                  <TrashIcon />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Wizard modal ──────────────────────────────────────────────────────────────

function StepDot({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  const bg = active ? 'var(--action-primary)' : done ? 'var(--up)' : 'var(--surface-hover)'
  const color = (active || done) ? '#fff' : 'var(--text-3)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{done ? '✓' : n}</div>
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)', color: active ? 'var(--text-accent)' : 'var(--text-3)' }}>{label}</span>
    </div>
  )
}

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
  const isManual = config.type === 'manual'
  const [step, setStep] = useState<1 | 2>((isEdit || isManual) ? 2 : 1)
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
        if (!holdings.length) { setError('Agregá al menos un activo o monto mayor a 0.'); return }
        const creds = { institution_name: 'Manual', holdings }
        if (isEdit) await updateMutation.mutateAsync({ id: editId!, credentials: creds })
        else await addMutation.mutateAsync({ provider_type: 'manual', credentials: creds })
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

  const title = isManual ? 'Ingreso manual' : isEdit ? 'Editar posiciones' : config.label
  const subtitle = isManual ? 'Cargá tus activos o tu efectivo' : isEdit ? 'Ajustá cantidades o quitá activos' : config.tagline

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', padding: 24, overflowY: 'auto' }}>
      <div style={{ width: '100%', maxWidth: 520, background: 'var(--surface-elevated)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid var(--border-1)' }}>
          <ProviderLogo logoUrl={config.logoUrl} label={config.label} color={config.color} size={40} radius="var(--radius-lg)" />
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--text-1)', margin: 0 }}>{title}</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0 }}>{subtitle}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 'var(--radius-md)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><XIcon s={18} /></button>
        </div>

        {!isEdit && !isManual && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--border-1)' }}>
            <StepDot n={1} active={step === 1} done={step === 2} label="Instrucciones" />
            <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            <StepDot n={2} active={step === 2} done={false} label={config.type === 'csv' ? 'Importar' : 'Conectar'} />
          </div>
        )}

        <div style={{ padding: '20px 24px' }}>
          {step === 1 && !isManual && (
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
                  {field.note && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)', margin: 0, lineHeight: 1.4 }}>{field.note}</p>}
                </div>
              ))}

              {config.type === 'csv' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
                    Subí el archivo de operaciones que descargaste de IOL. Calculamos tu tenencia actual (compras − ventas).
                  </p>
                  <div onClick={() => fileRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-2)', padding: 28, cursor: 'pointer' }}>
                    <span style={{ color: 'var(--text-3)' }}><UploadIcon /></span>
                    {csvFile
                      ? <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-accent)', margin: 0 }}>{csvFile.name}</p>
                      : <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: 0 }}>Hacé click para seleccionar el archivo (.xls)</p>}
                  </div>
                  <input ref={fileRef} type="file" accept={config.accept ?? '.csv'} style={{ display: 'none' }} onChange={e => setCsvFile(e.target.files?.[0] ?? null)} />
                </div>
              )}

              {config.type === 'manual' && <ManualEntry holdings={manualHoldings} setHoldings={setManualHoldings} />}

              {error && (
                <div style={{ display: 'flex', gap: 8, background: 'var(--down-bg)', border: '1px solid rgba(244,98,110,0.25)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <span style={{ color: 'var(--down)', flexShrink: 0 }}><AlertIcon /></span>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--down)', margin: 0 }}>{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-1)' }}>
          <button onClick={(step === 1 || isEdit || isManual) ? onClose : () => setStep(1)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-sm)', color: 'var(--text-2)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ChevLeft />{(step === 1 || isEdit || isManual) ? 'Cancelar' : 'Volver'}
          </button>
          {step === 1 && !isEdit && !isManual
            ? <Button onClick={() => setStep(2)} icon={<ChevRight />}>Siguiente</Button>
            : <Button onClick={handleConnect} disabled={isSubmitting}>{isSubmitting ? 'Guardando…' : (isEdit ? 'Guardar' : config.type === 'csv' ? 'Importar' : config.type === 'manual' ? 'Guardar' : 'Conectar')}</Button>}
        </div>
      </div>
    </div>
  )
}

// ── Fila de activo conectado ──────────────────────────────────────────────────

type FlatHolding = HoldingDTO & { _key: string; provider_type: string; integration_id: string }

function AssetRow({ h, rate, format, onSave, onDelete }: {
  h: FlatHolding
  rate: number | undefined
  format: (n: number, rate?: number) => string
  onSave: (h: FlatHolding, amount: number) => Promise<void>
  onDelete: (h: FlatHolding) => Promise<void>
}) {
  const isManual = h.provider_type === 'manual'
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(String(h.amount))
  const [busy, setBusy] = useState(false)
  const category = (h.category as AssetCategory) ?? undefined

  async function save() {
    const n = parseFloat(amount)
    if (!Number.isFinite(n) || n < 0) return
    setBusy(true)
    try { await onSave(h, n); setEditing(false) } finally { setBusy(false) }
  }
  async function remove() {
    setBusy(true)
    try { await onDelete(h) } finally { setBusy(false) }
  }

  const iconBtn = (title: string, on: () => void, node: ReactNode, danger = false) => (
    <button onClick={on} title={title} disabled={busy}
      style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-inset)', border: '1px solid var(--border-1)', color: danger ? 'var(--down)' : 'var(--text-2)', cursor: busy ? 'default' : 'pointer', flexShrink: 0, opacity: busy ? 0.5 : 1, transition: 'all var(--dur-fast) var(--ease-out)' }}>
      {node}
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 2px', borderBottom: '1px solid var(--border-1)' }}>
      <AssetAvatar logoUrl={h.logo_url} symbol={h.asset_symbol} category={category} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{h.asset_symbol}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.asset_name}</div>
      </div>

      {editing ? (
        <>
          <Stepper value={amount} onChange={setAmount}
            step={stepFor({ category: category ?? 'fx', ref: h.asset_symbol })}
            decimals={decimalsFor({ category: category ?? 'fx' })} />
          {iconBtn('Guardar', save, <CheckIcon s={15} />)}
          {iconBtn('Cancelar', () => { setAmount(String(h.amount)); setEditing(false) }, <XIcon />)}
        </>
      ) : (
        <>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>{format(h.current_value_usd, rate)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{formatUnits(h.amount)} u.</div>
          </div>
          {isManual && (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {iconBtn('Editar cantidad', () => setEditing(true), <EditIcon />)}
              {iconBtn('Borrar activo', remove, <TrashIcon />, true)}
            </div>
          )}
        </>
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
  const updateMutation = useUpdateIntegration()
  const rate = portfolio?.usd_to_ars ?? undefined
  const [activeWizard, setActiveWizard] = useState<ProviderConfig | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const apiProviders = PROVIDERS.filter(p => p.group === 'api')
  const manualProviders = PROVIDERS.filter(p => p.group === 'manual')

  // id de la integración conectada para cada tarjeta (iol ↔ iol_csv).
  function connectedIdFor(value: ProviderType): string | undefined {
    const match = integrations?.find(i => i.provider_type === value || (value === 'iol' && i.provider_type === 'iol_csv'))
    return match?.id
  }

  const allHoldings: FlatHolding[] = (portfolio?.providers ?? [])
    .flatMap((p, pi) => p.holdings.map((h, hi) => ({
      ...h, _key: `${pi}:${hi}:${h.asset_symbol}`, provider_type: p.provider_type, integration_id: p.integration_id,
    })))
    .filter(h => h.amount > 0)
    .sort((a, b) => b.current_value_usd - a.current_value_usd)

  /** Edita/borra un holding manual: lee las posiciones guardadas (fuente
   *  autoritativa), aplica el cambio y hace PATCH de la integración. */
  async function patchManual(h: FlatHolding, amount: number | null) {
    const { api } = await import('@/lib/api')
    const { data } = await api.get<{ institution_name: string; holdings: Array<Record<string, unknown> & { symbol: string }> }>(
      `/api/v1/integrations/${h.integration_id}/manual`
    )
    const current = data.holdings ?? []
    const next = amount === null
      ? current.filter(x => x.symbol !== h.asset_symbol)
      : current.map(x => (x.symbol === h.asset_symbol ? { ...x, amount } : x))
    await updateMutation.mutateAsync({
      id: h.integration_id,
      credentials: { institution_name: data.institution_name || 'Manual', holdings: next },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div className="aa-sec aa-sec--1">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-1)' }}>Integraciones</span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '6px 0 0', color: 'var(--text-1)' }}>
          Conectá lo que ya usás
        </h1>
      </div>

      {/* Activos conectados */}
      {!isLoading && allHoldings.length > 0 && (
        <section className="aa-sec aa-sec--2">
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 10 }}>
            Activos conectados
          </span>
          <div>
            {allHoldings.map(h => (
              <AssetRow key={h._key} h={h} rate={rate} format={format}
                onSave={(hh, amount) => patchManual(hh, amount)}
                onDelete={(hh) => patchManual(hh, null)} />
            ))}
          </div>
        </section>
      )}

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} style={{ height: 60, borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', animation: 'aa-pulse 1.5s ease-in-out infinite alternate' }} />)}
        </div>
      )}

      {/* Conexiones automáticas */}
      <section className="aa-sec aa-sec--3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Conexiones automáticas</span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>Próximamente agregaremos más</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {apiProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} connectedId={connectedIdFor(p.value)}
              onClick={() => setActiveWizard(p)} onRemove={setConfirmDeleteId} />
          ))}
        </div>
      </section>

      {/* Ingreso manual */}
      <section className="aa-sec aa-sec--4">
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 12 }}>Ingreso manual</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
          {manualProviders.map(p => (
            <ProviderPickerCard key={p.value} config={p} onClick={() => setActiveWizard(p)} onRemove={setConfirmDeleteId} />
          ))}
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
          <ShieldIcon /> Todas las credenciales se cifran con AES-256 y nunca se almacenan en texto plano.
        </div>
      </section>

      {activeWizard && <WizardModal config={activeWizard} onClose={() => setActiveWizard(null)} onSuccess={() => setActiveWizard(null)} />}

      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <Card padding="lg" raised style={{ width: '100%', maxWidth: 360 }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-1)', margin: '0 0 8px' }}>¿Eliminar integración?</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: '0 0 20px' }}>
              Se eliminarán las credenciales almacenadas. Podés volver a conectar cuando quieras.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={() => { deleteMutation.mutate(confirmDeleteId); setConfirmDeleteId(null) }} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        @keyframes aa-pulse { from { opacity: 0.4 } to { opacity: 0.9 } }
        @keyframes aa-pop { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes aa-shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
        .aa-skel-circle {
          background: linear-gradient(90deg, var(--surface-card) 25%, var(--surface-hover) 50%, var(--surface-card) 75%);
          background-size: 200% 100%;
          animation: aa-shimmer 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
