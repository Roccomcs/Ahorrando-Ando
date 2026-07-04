'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'midnight' | 'sepia'

export const THEMES: { value: Theme; label: string; swatch: string }[] = [
  { value: 'dark', label: 'Oscuro', swatch: '#0B0E14' },
  { value: 'light', label: 'Claro', swatch: '#F4F7FB' },
  { value: 'midnight', label: 'Medianoche', swatch: '#0A0F1E' },
  { value: 'sepia', label: 'Sepia', swatch: '#F3EBDD' },
]

const STORAGE_KEY = 'aa-theme'
const DEFAULT_THEME: Theme = 'dark'

function isTheme(v: string | null): v is Theme {
  return v === 'dark' || v === 'light' || v === 'midnight' || v === 'sepia'
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Aplica el tema elegido por el usuario en el dashboard.
 * Landing y login fuerzan dark por su cuenta (ver ForceDarkTheme),
 * sin tocar la preferencia guardada.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    const active = isTheme(saved) ? saved : DEFAULT_THEME
    setThemeState(active)
    // Los efectos corren de hijo a padre: si una página ya forzó dark
    // (landing/login), no pisarla con el tema guardado.
    if (!document.documentElement.hasAttribute('data-force-dark')) {
      document.documentElement.setAttribute('data-theme', active)
    }
  }, [])

  function setTheme(next: Theme) {
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}

/**
 * Fuerza data-theme="dark" mientras está montado (landing/login).
 * Al desmontar restaura el tema guardado por el usuario.
 */
export function ForceDarkTheme() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-force-dark', '')
    root.setAttribute('data-theme', 'dark')
    return () => {
      root.removeAttribute('data-force-dark')
      const saved = localStorage.getItem(STORAGE_KEY)
      root.setAttribute('data-theme', isTheme(saved) ? saved : DEFAULT_THEME)
    }
  }, [])
  return null
}
