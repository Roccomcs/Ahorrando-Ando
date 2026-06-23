interface AppLogoProps {
  size?: number
}

export function AppLogo({ size = 32 }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="43" y="48" width="14" height="60" rx="7" fill="#3DD993" />
      <path d="M50 54 C8 56 6 12 16 20 C26 28 50 42 50 54Z" fill="#3DD993" />
      <path d="M52 50 C80 54 86 12 78 16 C70 20 52 36 52 50Z" fill="#E8C268" />
    </svg>
  )
}
