import { Sidebar } from '@/components/ds/Sidebar'
import { Topbar } from '@/components/ds/Topbar'
import { CurrencyProvider } from '@/lib/currency-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar />
          <main className="aa-main" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', minWidth: 0 }}>
            <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </CurrencyProvider>
  )
}
