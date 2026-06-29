/* eslint-disable @next/next/no-img-element */
import styles from './AppLogo.module.css'

interface AppLogoProps {
  size?: number
}

export function AppLogo({ size = 32 }: AppLogoProps) {
  return (
    <span className={styles.wrap} style={{ width: size, height: size }}>
      <img src="/logoNegro.svg" alt="Ahorrando Ando" width={size} height={size} className={styles.dark} />
      <img src="/logo.svg" alt="Ahorrando Ando" width={size} height={size} className={styles.light} />
    </span>
  )
}
