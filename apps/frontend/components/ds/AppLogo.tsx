/* eslint-disable @next/next/no-img-element */

interface AppLogoProps {
  size?: number
}

/**
 * Logo de Ahorrando Ando.
 * Renderiza el archivo en /public/logo.svg (provisto por diseño).
 * Reemplazar ese archivo actualiza el logo en landing, login y sidebar.
 */
export function AppLogo({ size = 32 }: AppLogoProps) {
  return (
    <img
      src="/logo.svg"
      alt="Ahorrando Ando"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain', filter: 'invert(1)', mixBlendMode: 'screen' }}
    />
  )
}
