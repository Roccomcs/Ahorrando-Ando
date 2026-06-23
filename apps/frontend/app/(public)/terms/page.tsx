import Link from 'next/link'

export const metadata = { title: 'Términos de Uso — Ahorrando Ando' }

const s = {
  page: { maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-ui)', color: 'var(--text-1)' } as React.CSSProperties,
  h1: { fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 8px' } as React.CSSProperties,
  meta: { fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: '0 0 40px' } as React.CSSProperties,
  h2: { fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', margin: '32px 0 12px', color: 'var(--text-1)' } as React.CSSProperties,
  p: { fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 12px' } as React.CSSProperties,
  ul: { fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 1.7, paddingLeft: 20, margin: '0 0 12px' } as React.CSSProperties,
}

export default function TermsPage() {
  return (
    <div style={s.page}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-accent)', textDecoration: 'none', marginBottom: 32 }}>
        ← Volver al inicio
      </Link>

      <h1 style={s.h1}>Términos de Uso</h1>
      <p style={s.meta}>Última actualización: junio de 2026</p>

      <h2 style={s.h2}>1. Aceptación</h2>
      <p style={s.p}>Al crear una cuenta en Ahorrando Ando, aceptás estos Términos de Uso. Si no estás de acuerdo, no uses el servicio.</p>

      <h2 style={s.h2}>2. Qué es Ahorrando Ando</h2>
      <p style={s.p}>Ahorrando Ando es una herramienta personal de visualización de portfolio financiero. Conecta tus cuentas en brokers y exchanges para mostrar tu patrimonio en un solo lugar.</p>
      <p style={s.p}><strong>Ahorrando Ando no es un servicio financiero, banco, broker ni asesor de inversiones.</strong> No ejecuta operaciones, no guarda dinero y no ofrece recomendaciones de inversión.</p>

      <h2 style={s.h2}>3. Uso permitido</h2>
      <ul style={s.ul}>
        <li>Uso personal, no comercial.</li>
        <li>Solo podés conectar cuentas propias.</li>
        <li>No podés intentar acceder a datos de otros usuarios.</li>
        <li>No podés usar la plataforma para actividades ilegales.</li>
      </ul>

      <h2 style={s.h2}>4. Credenciales de terceros</h2>
      <p style={s.p}>Cuando conectás un broker o exchange, proporcionás credenciales (API keys, tokens) bajo tu propia responsabilidad. Te recomendamos usar siempre <strong>permisos de solo lectura</strong> cuando el proveedor lo permita.</p>
      <p style={s.p}>Ahorrando Ando cifra estas credenciales con AES-256, pero no somos responsables de brechas de seguridad en los servidores de terceros.</p>

      <h2 style={s.h2}>5. Sin garantías financieras</h2>
      <p style={s.p}>Los valores mostrados son estimaciones basadas en precios de mercado en tiempo real. Pueden diferir de los saldos reales por demoras en APIs, conversiones de moneda o errores en los datos de proveedores externos. No uses esta información como base única para decisiones financieras.</p>

      <h2 style={s.h2}>6. Disponibilidad</h2>
      <p style={s.p}>Ahorrando Ando es un servicio en desarrollo. No garantizamos disponibilidad 24/7. Podemos modificar o interrumpir el servicio en cualquier momento.</p>

      <h2 style={s.h2}>7. Eliminación de cuenta</h2>
      <p style={s.p}>Podés eliminar tu cuenta en cualquier momento desde Configuración. Al hacerlo, todos tus datos se borran permanentemente e irreversiblemente.</p>

      <h2 style={s.h2}>8. Cambios en los términos</h2>
      <p style={s.p}>Podemos actualizar estos términos. Te notificaremos por email si hay cambios significativos. El uso continuado del servicio implica aceptación de los nuevos términos.</p>

      <h2 style={s.h2}>9. Contacto</h2>
      <p style={s.p}>Para consultas, escribinos a <strong>roccom.cicero@gmail.com</strong>.</p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-1)', display: 'flex', gap: 24, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
        <Link href="/privacy" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Política de Privacidad</Link>
        <Link href="/" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Ahorrando Ando</Link>
      </div>
    </div>
  )
}
