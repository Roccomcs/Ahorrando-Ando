interface AppLogoProps {
  size?: number
}

export function AppLogo({ size = 32 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stem — grueso, redondeado abajo */}
      <rect x="41" y="50" width="18" height="62" rx="9" fill="#3DD993" />

      {/* Hoja izquierda — verde, amplia, apunta al noroeste */}
      <path
        d="M50 58 C28 62 4 44 14 18 C24 -6 56 24 50 58Z"
        fill="#3DD993"
      />

      {/* Hoja derecha — dorada, apunta al noreste */}
      <path
        d="M52 52 C62 22 90 10 84 24 C78 38 60 50 52 52Z"
        fill="#E8C268"
      />
    </svg>
  )
}
