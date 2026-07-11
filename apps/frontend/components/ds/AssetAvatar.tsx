'use client'

import { useState } from 'react'
import { useAssetLogo } from '@/hooks/usePortfolio'
import type { AssetCategory } from '@/lib/types'

// Etiquetas y colores por tipo de activo. Compartidos por todas las pantallas
// para que un activo se vea igual en dashboard, performance, historial, etc.
export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  crypto: 'Cripto', stock: 'Acción', cedear: 'CEDEAR', bond: 'Bono', fx: 'Efectivo',
}
export const CATEGORY_COLOR: Record<AssetCategory, string> = {
  crypto: '#E8C268', stock: '#63B8F4', cedear: '#9D8CFF', bond: '#3DD993', fx: '#8A97AB',
}

// Banderas para el efectivo (los emoji de bandera no renderizan en Windows).
const FX_FLAGS: Record<string, string> = {
  ARS: 'https://flagcdn.com/w80/ar.png',
  USD: 'https://flagcdn.com/w80/us.png',
  EUR: 'https://flagcdn.com/w80/eu.png',
}
export function fxFlag(ref?: string | null): string | null {
  return ref ? FX_FLAGS[ref.toUpperCase()] ?? null : null
}

/**
 * Logo del activo. El backend no bloquea el portfolio resolviendo logos: acá se
 * piden por símbolo (cacheados) y se muestra un skeleton mientras cargan. Para
 * el efectivo (fx) se usa la bandera del país.
 */
export function AssetAvatar({
  logoUrl, symbol, category, size = 36,
}: { logoUrl?: string | null; symbol: string; category?: AssetCategory | null; size?: number }) {
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
