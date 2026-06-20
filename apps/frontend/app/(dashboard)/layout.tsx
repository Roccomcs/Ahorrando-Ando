import { Sidebar } from '@/components/ds/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minWidth: 0 }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
