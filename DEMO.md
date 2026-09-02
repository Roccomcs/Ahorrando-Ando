# Cuenta de demostración

La pantalla de login incluye **Acceso de demostración**. Al tocarla, el backend
crea o restaura la cuenta `demo@ahorrandoando.app` y abre una sesión normal de
la aplicación.

La cuenta contiene datos ficticios para mostrar el producto completo:

- efectivo en ARS, USD y EUR;
- Bitcoin, Ethereum, Solana, USDT, BNB y Cardano;
- CEDEARs de Apple, Microsoft, NVIDIA y SPY;
- acciones argentinas, bonos AL30 y Mercado Fondo;
- historial de 90 días, movimientos, alertas y registros de auditoría.

Los precios de la demo están congelados de forma intencional. No se consultan
Binance, Mercado Pago, Bull Market, CoinGecko ni otros servicios externos, por
lo que la demostración sigue funcionando aunque una integración esté caída.

Cada vez que se inicia la demo se restaura el estado de muestra. La contraseña
y el cambio de email están deshabilitados para esta cuenta, y sus datos no
representan información financiera real.

## Requisito de despliegue

La ruta pública `POST /api/v1/auth/demo` usa las mismas variables que el resto
del backend, especialmente `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` y
`ENCRYPTION_KEY`. No necesita SMTP, Google OAuth ni credenciales de brokers.

El frontend necesita tener configurado `BACKEND_URL` para que
`/api/auth/demo` pueda comunicarse con Railway.
