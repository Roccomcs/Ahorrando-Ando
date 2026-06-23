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
      {/* Stem */}
      <rect x="44" y="50" width="12" height="60" rx="6" fill="#3DD993" />

      {/* Left leaf — green, points upper-left */}
      <path
        d="M50 55 C30 58 8 40 16 20 C24 2 52 28 50 55Z"
        fill="#3DD993"
      />

      {/* Right leaf — gold, points upper-right */}
      <path
        d="M52 50 C58 28 82 12 78 22 C72 32 56 48 52 50Z"
        fill="#E8C268"
      />
    </svg>
  )
}
