import { Sidebar } from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      {/* En mobile el sidebar es un drawer absoluto, así que el main ocupa todo el ancho */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-4 pt-16 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  )
}
