import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-4xl)', fontWeight: 700, color: 'var(--text-3)', margin: '0 0 16px', letterSpacing: '-0.04em' }}>404</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', fontStretch: 'var(--display-stretch)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 8px', color: 'var(--text-1)' }}>
          Página no encontrada
        </h1>
        <p style={{ fontSize: 'var(--text-md)', color: 'var(--text-2)', margin: '0 0 28px' }}>
          La página que buscás no existe o fue movida.
        </p>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 20px', borderRadius: 'var(--radius-md)', background: 'var(--action-primary)', color: '#fff', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-base)', transition: 'background var(--dur-fast) var(--ease-out)' }}>
          Ir al dashboard
        </Link>
      </div>
    </div>
  )
}
