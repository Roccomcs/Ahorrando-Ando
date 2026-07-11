import { Sidebar } from '@/components/ds/Sidebar'
import { Topbar } from '@/components/ds/Topbar'
import { ToastProvider } from '@/components/ds/Toast'
import { CurrencyProvider } from '@/lib/currency-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <ToastProvider>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-raised)' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <Topbar />
            <main id="main" tabIndex={-1} className="aa-main" style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', minWidth: 0, background: 'var(--surface-canvas)' }}>
              <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                {children}
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    </CurrencyProvider>
  )
}
