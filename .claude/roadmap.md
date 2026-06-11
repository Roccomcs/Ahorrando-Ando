# Roadmap — Ahorrando Ando

Estado al 2026-06-10: backend completo (fases 1-5), sin frontend, sin deploy.

---

## Fase 6 — Seguridad y hardening del backend ✅ COMPLETA (2026-06-10)

Lo que falta para que el backend sea production-safe.

### 6.1 Refresh token blacklist
- Guardar refresh tokens usados/revocados en Redis con TTL = 30d
- Al hacer logout, invalidar el refresh token activo
- `POST /api/v1/auth/logout` → agrega token a blacklist
- `get_current_user` verifica que el token no esté en la blacklist
- **Por qué:** sin esto, un token robado sirve durante 30 días completos

### 6.2 Rate limiting real por usuario
- El `rate_limiter.py` actual es un esqueleto — implementarlo con Redis sliding window
- Límites: 10 req/s por IP en endpoints públicos, 60 req/min por usuario en autenticados
- Respuesta estándar: HTTP 429 con header `Retry-After`
- **Por qué:** sin rate limiting, un usuario puede hammear el dashboard y agotar las APIs de terceros

### 6.3 Validación de credenciales al agregar integración
- `POST /integrations/` actualmente guarda sin verificar que las credenciales funcionen
- Llamar a `provider.authenticate()` antes de persistir
- Si falla → HTTP 400 con mensaje claro del proveedor
- **Por qué:** el usuario puede agregar credenciales vencidas/erróneas sin saberlo

### 6.4 Rotación de ENCRYPTION_KEY
- Mecanismo para re-encriptar credentials almacenadas cuando cambia la key
- Script de migración: `python scripts/rotate_encryption_key.py --old-key X --new-key Y`
- **Por qué:** si la key se filtra hay que poder rotar sin perder las integraciones

### 6.5 Audit log
- Tabla `audit_log` con `user_id`, `action`, `ip`, `timestamp`, `metadata`
- Registrar: login, register, add_integration, delete_integration, refresh_token
- Endpoint `GET /api/v1/auth/audit` para que el usuario vea su historial
- **Por qué:** seguridad básica y compliance; detectar accesos no autorizados

---

## Fase 7 — Nuevos providers

Extender la cobertura financiera argentina.

### 7.1 Lemon Cash
- Exchange crypto argentino con API REST documentada
- Auth: Bearer token (API key)
- Endpoints: `/api/user/balance`, `/api/user/portfolio`
- Conversión ARS→USD via ExchangeRateService (ya existe)
- Agregar `LEMON` a `ProviderType`

### 7.2 Invertir Online (IOL)
- Broker argentino con API REST oficial
- Auth: OAuth2 (usuario/contraseña → Bearer token con refresh)
- Holdings: acciones, bonos, CEDEARs, FCI
- Precios vía el mismo IOL (tienen endpoint de cotizaciones)
- El token IOL expira en 20 min → auto-refresh interno al provider

### 7.3 Balanz
- Broker argentino, sin API pública documentada
- Alternativa: scraping autenticado del panel web
- Marcar como `@experimental` hasta tener API estable

### 7.4 Wallet on-chain (Ethereum/Polygon)
- Input: dirección pública (0x...) — sin private key, solo lectura
- Balance via Alchemy/Infura RPC o Etherscan API
- Precios via CoinGecko (ya hay `coingecko_price_service.py`)
- Útil para DeFi, staking, tokens ERC-20

### Criterio de prioridad
1. Lemon Cash (API documentada, base de usuarios grande)
2. IOL (cubre acciones y bonos, mercado tradicional)
3. Wallet on-chain (diferenciador vs otras apps)
4. Balanz (sin API → mayor riesgo de mantenimiento)

---

## Fase 8 — Frontend web (Next.js) ✅ COMPLETA (2026-06-11)

El dashboard visual. Es la fase más grande del roadmap.

### Stack propuesto
- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + shadcn/ui para componentes
- **TanStack Query** para fetch/cache de datos del backend
- **Recharts** o **Tremor** para gráficos
- Carpeta: `apps/frontend/`

### 8.1 Autenticación
- Páginas: `/login`, `/register`
- Guardar access token en memoria (no localStorage), refresh token en cookie httpOnly
- Middleware Next.js para redirigir a /login si no hay sesión
- Auto-refresh del access token antes de que expire

### 8.2 Dashboard principal (`/`)
- Card: total portfolio en USD (grande, destacado)
- Card: cambio % 24h y 30d con color (verde/rojo)
- Lista de providers con su balance individual y holdings
- Botón "Actualizar" → llama a `POST /dashboard/refresh`
- Skeleton loading mientras carga

### 8.3 Gráfico de evolución (`/history`)
- Line chart con el valor histórico del portfolio
- Selector de rango: 7d / 30d / 90d / 1y
- Punto de hover con valor exacto y fecha

### 8.4 Gestión de integraciones (`/integrations`)
- Lista de integraciones conectadas con estado (ok / error)
- Formulario modal para agregar nueva integración con campos dinámicos por provider
- Botón eliminar con confirmación

### 8.5 Perfil y seguridad (`/settings`)
- Cambio de contraseña
- Historial de accesos (audit log)
- Cerrar sesión (logout → blacklist del refresh token)

---

## Fase 9 — Alertas y notificaciones

Valor agregado sobre el portfolio estático.

### 9.1 Alertas de precio
- El usuario configura: "avisame si BTC baja de $80,000 USD"
- Tabla `price_alerts`: `user_id`, `asset_symbol`, `threshold_usd`, `direction` (above/below), `active`
- Background job (APScheduler o Celery Beat) que chequea precios cada 5 min
- Cuando se dispara → notificación + marcar como `triggered`

### 9.2 Canal de notificaciones — Email
- Usar Resend o SendGrid (ambos tienen tier free)
- Templates: alerta disparada, resumen semanal del portfolio
- Configuración por usuario: qué quiere recibir

### 9.3 Canal de notificaciones — Push web
- Web Push API (sin app móvil)
- El frontend registra el service worker y el endpoint push
- El backend guarda `PushSubscription` por usuario y envía vía `web-push`

### 9.4 Resumen semanal automático
- Cron job: todos los lunes 9am, envía email con snapshot de la semana
- Incluye: valor total, cambio %, top 3 assets

---

## Fase 10 — Deploy y CI/CD ✅ COMPLETA (2026-06-11)

Llevar todo a producción.

### 10.1 GitHub Actions
- Pipeline en `.github/workflows/`:
  - `ci.yml`: lint (ruff) + unit tests en cada PR
  - `cd.yml`: build Docker + push a registry + deploy en merge a main
- Secrets en GitHub: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`

### 10.2 Plataforma de deploy
**Opción A — Railway** (recomendado para arrancar)
- Un proyecto con 3 servicios: postgres, redis, backend
- Variables de entorno en el panel de Railway
- Deploy automático en push a main
- ~$10-20/mes dependiendo del uso

**Opción B — VPS propio** (más barato a largo plazo)
- Un servidor Ubuntu en Hetzner/DigitalOcean (~$6/mes)
- Docker Compose con `docker-compose.prod.yml` (ya existe)
- Traefik como reverse proxy con SSL automático (Let's Encrypt)
- Deploy via GitHub Actions + SSH

### 10.3 Dominio y SSL
- Dominio: `ahorrandoando.app` o similar
- SSL automático vía Traefik + Let's Encrypt (si VPS) o incluido en Railway

### 10.4 Monitoreo
- Uptime Robot (free) para alertas de caída
- Sentry para errores en backend y frontend
- Logs en Railway o en archivo rotativo si VPS

---

## Fase 11 — Analytics avanzados

Una vez que hay datos históricos acumulados.

### 11.1 Distribución de portfolio
- Breakdown por asset, por provider, por tipo (crypto / fiat / acciones)
- Pie chart en el frontend
- `GET /api/v1/dashboard/allocation` → lista con `{asset, percentage, usd_value}`

### 11.2 Rendimiento por asset
- Tracking de ROI por holding individual: `(precio_actual - precio_entrada) / precio_entrada`
- Requiere guardar `entry_price` en el snapshot o deducirlo del historial
- Tabla de holdings con columnas: asset, cantidad, valor actual, ROI%

### 11.3 Benchmarking
- Comparar el portfolio contra BTC, S&P 500, o índice propio
- `GET /api/v1/dashboard/benchmark?asset=BTC&period=30d`
- "Tu portfolio subió 5% mientras BTC subió 12%"

### 11.4 Exportación de datos
- `GET /api/v1/dashboard/export?format=csv` → descarga CSV con historial de snapshots
- Útil para declaración de bienes, impuestos, análisis personal

---

## Orden de prioridad sugerido

| # | Fase | Impacto | Esfuerzo | Prioridad |
|---|------|---------|----------|-----------|
| 6 | Seguridad y hardening | Alto | Bajo | **Inmediato** |
| 8 | Frontend web | Muy alto | Alto | **Siguiente** |
| 7 | Nuevos providers | Alto | Medio | Después del frontend |
| 10 | Deploy y CI/CD | Alto | Medio | En paralelo con frontend |
| 9 | Alertas | Medio | Medio | Post-deploy |
| 11 | Analytics avanzados | Medio | Alto | Con datos históricos |

---

## Deuda técnica conocida

| Item | Descripción | Urgencia |
|------|-------------|----------|
| BullMarket API | Sin API pública, endpoints internos pueden romperse | Media |
| `datetime.utcnow()` | Deprecated en Python 3.13, usar `datetime.now(UTC)` | Baja |
| Coverage tests | Solo unit tests; falta integration y e2e | Media |
| `GET /integrations/` | Devuelve dos rutas iguales en el router (bug menor) | Alta |
