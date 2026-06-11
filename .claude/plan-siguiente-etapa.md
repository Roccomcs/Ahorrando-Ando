# Plan siguiente etapa — Ahorrando Ando
> Creado: 2026-06-11. Proyecto base completo (fases 1–11). Este plan cubre lo que falta para que sea una app production-grade real.

---

## Prioridad 1 — Bugs y deuda técnica bloqueante ✅ COMPLETA (2026-06-11)

### 1.1 Bug: rutas duplicadas en `GET /integrations/`
- **Qué pasa:** el router de integrations registra la misma ruta dos veces, FastAPI usa la primera y la segunda queda muerta
- **Dónde:** `src/interfaces/http/routers/integrations_router.py`
- **Fix:** revisar las llamadas a `add_api_route` / decoradores y eliminar el duplicado

### 1.2 `datetime.utcnow()` deprecado en Python 3.13
- **Afecta:** `get_aggregated_portfolio.py`, `register_user.py`, `postgres_user_repository.py`, tests
- **Fix:** reemplazar todas las ocurrencias con `datetime.now(timezone.utc)` y quitar el `.replace(tzinfo=None)` que pierde la info de zona horaria

### 1.3 Validación de credenciales al conectar integración
- **Qué pasa:** `POST /integrations/` guarda las credenciales sin verificar que sean válidas
- **Fix:** llamar a `provider.get_holdings()` o un método `validate()` antes de persistir; si falla → HTTP 400 con mensaje claro del provider
- **Impacto:** el usuario no puede agregar credenciales erróneas sin saberlo

---

## Prioridad 2 — Testing (cobertura real) ✅ COMPLETA (2026-06-11)

El proyecto solo tiene 7 archivos de unit tests que cubren domain y 3 use cases. Faltan:

### 2.1 Unit tests faltantes
- `test_create_alert.py` — validaciones de umbral y direction
- `test_check_alerts.py` — mock CoinGecko, verifica que `mark_triggered` se llama
- `test_get_allocation.py` — portfolio vacío, distribución correcta
- `test_get_benchmark.py` — sin snapshots, con snapshots
- `test_export_csv.py` — formato correcto, sin snapshots devuelve header vacío

### 2.2 Integration tests (requieren DB + Redis reales en CI)
- `test_auth_flow.py` — register → login → refresh → logout, verifica blacklist
- `test_portfolio_cache.py` — primera llamada miss, segunda hit, refresh invalida
- `test_rate_limiter.py` — superar el límite devuelve 429 con Retry-After
- `test_alerts_trigger.py` — crear alerta, simular precio que la dispara, verificar `triggered_at`

### 2.3 E2E con httpx TestClient
- Happy path completo: register → add integration → get dashboard → get allocation
- Error paths: credenciales inválidas, token expirado, rate limit

### 2.4 Fixtures y factories
- `UserFactory`, `IntegrationFactory`, `PriceAlertFactory` usando `factory_boy` o simplemente helpers
- `conftest.py` con sesión de DB en memoria (SQLite async) para unit tests que tocan repos

---

## Prioridad 3 — Seguridad y robustez ✅ COMPLETA (2026-06-11)

### 3.1 CORS restrictivo en producción
- Actualmente `allow_origins=["*"]` — funciona en dev pero es inseguro en prod
- Fix: leer `ALLOWED_ORIGINS` del env, fallback a `["*"]` solo si `ENV=development`

### 3.2 Validación de entrada más estricta
- `asset_symbol` en alertas: solo letras, máx 10 chars (evitar inyección)
- `direction` en alertas: ya se valida en el use case pero no en el schema Pydantic — agregar `Literal["above", "below"]`
- `chain` en onchain provider: solo `"ethereum"` o `"polygon"`, rechazar cualquier otra cosa
- Sanitizar `note` de alertas (max 200 chars)

### 3.3 Secrets en headers de respuesta
- Revisar que ningún endpoint devuelva `hashed_password`, `encrypted_credentials` ni tokens en respuestas de error

### 3.4 Timeout global en providers
- `BaseHttpClient` no tiene timeout global configurado — una API externa lenta puede colgar el worker
- Fix: agregar `timeout=httpx.Timeout(10.0)` por defecto, configurable por provider

### 3.5 Circuit breaker por provider
- Si Binance falla 3 veces seguidas, no seguir llamando durante 5 minutos
- Evita que un provider caído demore todo el dashboard
- Usar `tenacity` (ya instalado) con `stop_after_attempt` + `wait_exponential`

---

## Prioridad 4 — UX y producto ✅ COMPLETA (2026-06-11)

### 4.1 Onboarding en el frontend
- Primera vez que el usuario entra al dashboard sin integraciones: pantalla de bienvenida con pasos guiados en lugar de la tabla vacía
- "Paso 1: conectá tu primera cuenta" con shortcuts directos a cada provider popular

### 4.2 Estado de error por integración
- Actualmente `is_active: bool` pero no hay mensaje de error
- Agregar campo `last_error: str | None` y `last_sync_at: datetime | None` al modelo `Integration`
- Cuando un provider falla durante `get_aggregated`, guardar el error en la integración en lugar de silenciarlo
- En el frontend: mostrar badge rojo con tooltip del error

### 4.3 Refresh manual por integración
- Botón "Sincronizar" individual por integración, no solo el botón global del dashboard
- `POST /integrations/{id}/sync` → invalida cache del provider específico, no de todo el portfolio

### 4.4 Cambio de contraseña
- La página `/settings` tiene la sección de cambio de contraseña pero no está conectada
- Implementar `POST /api/v1/auth/change-password` (requiere contraseña actual + nueva)

### 4.5 Eliminar cuenta
- `DELETE /api/v1/auth/me` — elimina usuario, integraciones, alertas y suscripciones push en cascada
- Flujo de confirmación en el frontend (escribir email para confirmar)

### 4.6 Paginación en historial
- `/dashboard/history` devuelve todos los snapshots — si hay 1 año de datos son miles de puntos
- Agregar paginación o limitar a N puntos con downsampling (tomar 1 punto cada X horas según el rango)

### 4.7 Notificación en el dashboard cuando hay alertas disparadas
- Badge con el número de alertas disparadas en el ícono de Alertas del Sidebar
- Llamada ligera `GET /alerts?active=true` para el contador

---

## Prioridad 5 — Nuevos providers y activos ✅ COMPLETA (2026-06-11)

### 5.1 Balanz (broker argentino)
- Sin API pública — opciones: scraping autenticado del panel web, o CSV import manual
- Alternativa más realista: import manual de CSV de extracto de cuenta
- Endpoint: `POST /integrations/balanz/import` con multipart file upload

### 5.2 Cocos Capital
- Broker argentino relativamente nuevo con app moderna
- Investigar si tienen API o endpoints internos documentados
- Similar a IOL en productos (acciones, bonos, FCI)

### 5.3 Naranja X / Uala
- Fintech argentinas con cuentas de ahorro y FCI
- Tienen app móvil — puede haber endpoints internos

### 5.4 Multi-wallet on-chain (Solana, BSC)
- Actualmente solo ETH y Polygon via Etherscan
- Agregar Solana (Solscan API o Helius) y BSC (BscScan — misma estructura que Etherscan)
- El `OnChainProvider` ya tiene la arquitectura para soportarlo con un `chain` param nuevo

### 5.5 Staking y DeFi
- Wallets con staking (ETH staking, Lido) o posiciones DeFi (Uniswap LP)
- Requiere APIs especializadas (Zapper, DeBank, o Etherscan events)
- Alta complejidad, baja prioridad hasta tener base de usuarios

---

## Prioridad 6 — Infraestructura y operaciones ✅ COMPLETA (2026-06-11)

### 6.1 Health check con dependencias
- El endpoint `/health` actual solo devuelve `{"status": "ok"}` sin verificar nada
- Agregar checks reales: `GET /health/live` (app viva) y `GET /health/ready` (DB + Redis conectados)
- Traefik y Kubernetes usan estos endpoints para routing y restarts

### 6.2 Métricas con Prometheus
- Exponer `GET /metrics` con:
  - Requests por endpoint (latencia p50/p95/p99)
  - Cantidad de usuarios activos
  - Tasa de error por provider
  - Tiempo de respuesta de cada API externa
- Usar `prometheus-fastapi-instrumentator` (1 línea para instrumentar todo FastAPI)

### 6.3 Logs estructurados (JSON)
- Actualmente los logs son texto plano con `logging.basicConfig`
- Cambiar a `structlog` o `python-json-logger` para logs en JSON
- Facilita parseo en Grafana, Datadog, o Railway Logs

### 6.4 Backup automático de base de datos
- Script `scripts/backup_db.sh` que dumpa Postgres y sube a S3 / Cloudflare R2
- Cron job en GitHub Actions (o en el VPS) cada 24h

### 6.5 Alertas de Sentry por provider
- Actualmente Sentry captura errores genéricos
- Agregar `sentry_sdk.set_tag("provider", provider_name)` antes de cada llamada externa
- Permite ver en Sentry qué provider está fallando más

### 6.6 Soporte móvil en el frontend
- El Sidebar actual colapsa mal en mobile (< 768px)
- Agregar hamburger menu para mobile con drawer lateral
- Las tablas de ROI y analytics necesitan scroll horizontal en pantallas pequeñas

---

## Prioridad 7 — Features avanzados de largo plazo

### 7.1 Multi-currency display
- Actualmente todo en USD — agregar opción de ver en ARS (con tipo de cambio MEP/blue)
- Selector en Settings: "Moneda de display: USD / ARS (oficial) / ARS (MEP)"
- Usar `bluelytics.com.ar` para tipo de cambio informal

### 7.2 Objetivos de ahorro (Goals)
- El usuario define metas: "Llegar a $10,000 USD para comprar un auto"
- Tabla `savings_goals`: `target_usd`, `target_date`, `label`
- Dashboard muestra progreso: barra de % completado + proyección a la fecha objetivo

### 7.3 Historial de transacciones
- Actualmente solo guardamos snapshots del portfolio total
- Agregar tabla `transactions`: `asset_symbol`, `amount`, `price_usd`, `type` (buy/sell/transfer), `date`
- Los providers que soportan historial (Binance, Etherscan) pueden poblarla automáticamente
- Frontend: página `/transactions` con filtros y búsqueda

### 7.4 Impuestos / Ganancias
- Calcular ganancia realizada por asset (necesita historial de transacciones)
- Reporte descargable para declaración de bienes personales en Argentina
- Formato compatible con AFIP (si tienen API / formato definido)

### 7.5 App móvil (React Native / Expo)
- El backend ya tiene la API completa — agregar `apps/mobile/`
- Expo con las mismas pantallas que el frontend web
- Push notifications nativas (más confiables que web push en iOS)

### 7.6 Compartir portfolio (modo público)
- Link público de solo lectura: `ahorrandoando.app/u/rocco`
- El usuario elige qué mostrar (total, distribución, sin valores exactos)
- Útil para mostrar a otros o para redes sociales

---

## Resumen por prioridad

| # | Área | Items | Esfuerzo estimado |
|---|------|-------|-------------------|
| 1 | Bugs bloqueantes | 3 | 1–2 días |
| 2 | Testing | 15+ tests | 3–4 días |
| 3 | Seguridad y robustez | 5 | 2–3 días |
| 4 | UX y producto | 7 | 3–5 días |
| 5 | Nuevos providers | 5 | 2–5 días cada uno |
| 6 | Infra y operaciones | 6 | 2–3 días |
| 7 | Features avanzados | 6 | 1–3 semanas cada uno |

### Por dónde empezar
1. **Fix bugs bloqueantes** (1.1, 1.2, 1.3) — son rápidos y mejoran la calidad base
2. **Tests de integración** (2.2) — el riesgo más alto de regresiones en producción
3. **Estado de error por integración** (4.2) — UX crítica cuando un provider falla
4. **Health check real** (6.1) — necesario antes de cualquier deploy serio
5. **Cambio de contraseña** (4.4) — feature básico que falta conectar
