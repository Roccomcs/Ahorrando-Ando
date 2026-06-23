import { Sidebar } from '@/components/ds/Sidebar'
import { UserMenu } from '@/components/ds/UserMenu'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Top bar con avatar */}
        <header style={{
          height: 52, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--surface-canvas)',
        }}>
          <UserMenu />
        </header>
        <main className="aa-main" style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', minWidth: 0 }}>
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
