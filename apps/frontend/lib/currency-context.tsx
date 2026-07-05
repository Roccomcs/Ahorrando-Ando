'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Currency = 'USD' | 'ARS'

interface CurrencyCtx {
  currency: Currency
  setCurrency: (c: Currency) => void
  /** Formatea un monto expresado en USD según la moneda seleccionada. */
  format: (amountUsd: number, rate?: number | null, opts?: { compact?: boolean }) => string
  /** Símbolo de la moneda activa. */
  symbol: string
}

const Ctx = createContext<CurrencyCtx | null>(null)

function fmt(amount: number, symbol: string, compact?: boolean) {
  if (compact && Math.abs(amount) >= 1000) {
    return `${symbol} ${(amount / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`
  }
  return `${symbol} ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD')

  useEffect(() => {
    const saved = localStorage.getItem('aa-currency')
    if (saved === 'USD' || saved === 'ARS') setCurrencyState(saved)
  }, [])

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    localStorage.setItem('aa-currency', c)
  }

  const format = (amountUsd: number, rate?: number | null, opts?: { compact?: boolean }) => {
    if (currency === 'ARS' && rate && rate > 0) {
      return fmt(amountUsd * rate, 'AR$', opts?.compact)
    }
    return fmt(amountUsd, 'US$', opts?.compact)
  }

  const symbol = currency === 'ARS' ? 'AR$' : 'US$'

  return <Ctx.Provider value={{ currency, setCurrency, format, symbol }}>{children}</Ctx.Provider>
}

export function useCurrency() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCurrency debe usarse dentro de CurrencyProvider')
  return ctx
}
