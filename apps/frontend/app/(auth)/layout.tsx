import { ForceDarkTheme } from '@/lib/theme-context'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceDarkTheme />
      {children}
    </>
  )
}
