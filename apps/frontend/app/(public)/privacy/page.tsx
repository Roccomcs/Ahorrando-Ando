import Link from 'next/link'

export const metadata = { title: 'Política de Privacidad — Ahorrando Ando' }

const s = {
  page: { maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'var(--font-ui)', color: 'var(--text-1)' } as React.CSSProperties,
  h1: { fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--tracking-tight)', margin: '0 0 8px' } as React.CSSProperties,
  meta: { fontSize: 'var(--text-sm)', color: 'var(--text-3)', margin: '0 0 40px' } as React.CSSProperties,
  h2: { fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', margin: '32px 0 12px', color: 'var(--text-1)' } as React.CSSProperties,
  p: { fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 1.7, margin: '0 0 12px' } as React.CSSProperties,
  ul: { fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 1.7, paddingLeft: 20, margin: '0 0 12px' } as React.CSSProperties,
}

export default function PrivacyPage() {
  return (
    <div style={s.page}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-sm)', color: 'var(--text-accent)', textDecoration: 'none', marginBottom: 32 }}>
        ← Volver al inicio
      </Link>

      <h1 style={s.h1}>Política de Privacidad</h1>
      <p style={s.meta}>Última actualización: junio de 2026</p>

      <h2 style={s.h2}>1. Qué datos recopilamos</h2>
      <p style={s.p}>Ahorrando Ando recopila los siguientes datos para funcionar:</p>
      <ul style={s.ul}>
        <li><strong>Email y contraseña</strong> — Para crear y autenticar tu cuenta. La contraseña se almacena con hash bcrypt, nunca en texto plano.</li>
        <li><strong>Credenciales de brokers/exchanges</strong> — API keys, tokens de acceso o archivos CSV que vos cargás. Se cifran con AES-256 (Fernet) antes de guardarse en base de datos.</li>
        <li><strong>Datos de portfolio</strong> — Saldos, posiciones, historial de valores calculados a partir de tus cuentas conectadas.</li>
        <li><strong>Logs de auditoría</strong> — Registros de inicio de sesión, cambios de contraseña y otras acciones de seguridad (IP, fecha, acción).</li>
      </ul>

      <h2 style={s.h2}>2. Cómo usamos tus datos</h2>
      <ul style={s.ul}>
        <li>Mostrar tu portfolio unificado y su historial.</li>
        <li>Enviarte alertas de precio y el resumen semanal si los activás.</li>
        <li>Detectar accesos no autorizados mediante los logs de auditoría.</li>
      </ul>
      <p style={s.p}>No compartimos tus datos con terceros, no los vendemos, y no los usamos para publicidad.</p>

      <h2 style={s.h2}>3. Seguridad</h2>
      <ul style={s.ul}>
        <li>Las credenciales de terceros se cifran con AES-256 (Fernet) en reposo.</li>
        <li>Las contraseñas se hashean con bcrypt (factor de trabajo 12).</li>
        <li>Los tokens de sesión usan JWT HS256 con rotación automática.</li>
        <li>Todas las comunicaciones usan HTTPS/TLS.</li>
        <li>Los refresh tokens se almacenan en cookies httpOnly y Secure.</li>
      </ul>

      <h2 style={s.h2}>4. Retención de datos</h2>
      <p style={s.p}>Tus datos se conservan mientras tu cuenta esté activa. Podés eliminar tu cuenta en cualquier momento desde Configuración → Eliminar cuenta. Al hacerlo, todos tus datos (credenciales, portfolio, historial) se borran permanentemente de nuestros servidores.</p>

      <h2 style={s.h2}>5. Cookies</h2>
      <p style={s.p}>Usamos una única cookie httpOnly y Secure llamada <code>refresh_token</code> para mantener tu sesión. No usamos cookies de tracking ni de publicidad.</p>

      <h2 style={s.h2}>6. Tus derechos</h2>
      <ul style={s.ul}>
        <li><strong>Acceso</strong>: podés ver todos tus datos en el dashboard.</li>
        <li><strong>Eliminación</strong>: podés borrar tu cuenta y todos tus datos desde Configuración.</li>
        <li><strong>Portabilidad</strong>: podés exportar tu historial de portfolio en CSV desde Analytics.</li>
      </ul>

      <h2 style={s.h2}>7. Contacto</h2>
      <p style={s.p}>Para consultas sobre privacidad, contactanos en <strong>roccom.cicero@gmail.com</strong>.</p>

      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-1)', display: 'flex', gap: 24, fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
        <Link href="/terms" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Términos de uso</Link>
        <Link href="/" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Ahorrando Ando</Link>
      </div>
    </div>
  )
}
