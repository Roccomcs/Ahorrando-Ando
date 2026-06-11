# Plan de Implementación — Ahorrando Ando Backend

## Estado actual: Scaffold completo ✅

La estructura de carpetas y archivos base está generada. Los archivos son esqueletos
funcionales con implementaciones placeholder donde las APIs reales aún no están integradas.

---

## Fase 1 — Infraestructura base ✅ COMPLETA (2026-06-11)

### 1.1 Base de datos ✅
- [x] PostgreSQL corriendo en Docker (`ahorrando_postgres`, puerto 5432)
- [x] `.env` configurado con `DATABASE_URL` real
- [x] Migración inicial aplicada — tablas: `users`, `integrations`, `portfolio_snapshots`
- [x] Verificado con `alembic revision --autogenerate`

### 1.2 Redis ✅
- [x] Redis corriendo en Docker (`ahorrando_redis`, puerto 6379)
- [x] `aioredis` reemplazado por `redis[asyncio]>=5` (aioredis roto en Python 3.13)
- [x] Verificado: `redis-cli ping → PONG`

### 1.3 Variables de entorno ✅
- [x] `.env` creado con keys generadas
- [x] `ENCRYPTION_KEY` (Fernet) y `JWT_SECRET` configurados

### Fixes aplicados durante fase 1
- `asyncpg` bumpeado a `^0.30.0` (0.29 no tenía wheel para Python 3.13)
- `passlib` removido — reemplazado por `bcrypt` directo (passlib 1.7.x incompatible con bcrypt>=4)
- `aioredis` → `redis[asyncio]` (distutils removido en Python 3.12+)
- `pyproject.toml` corregido (campo `python` no va en `[tool.poetry]`)
- `alembic/script.py.mako` creado manualmente (faltaba por no usar `alembic init`)

### Verificación end-to-end ✅
- `POST /api/v1/auth/register` → JWT OK, usuario persistido en PostgreSQL
- `POST /api/v1/auth/login` → JWT OK
- `GET /api/v1/dashboard/` con JWT → `{total_usd: 0, providers: []}` (sin integraciones aún)
- Email duplicado → HTTP 400
- JWT inválido → HTTP 401

---

## Fase 2 — Auth completo ✅ COMPLETA (2026-06-11)

### 2.1 Endpoints funcionales ✅
- [x] `POST /api/v1/auth/register` → JWT pair (access + refresh)
- [x] `POST /api/v1/auth/login` → JWT pair
- [x] `GET /api/v1/auth/me` → `{id, email, created_at}` del usuario autenticado

### 2.2 Refresh token ✅
- [x] Access token: 1 hora, payload `{sub, type: "access"}`
- [x] Refresh token: 30 días, payload `{sub, type: "refresh"}`
- [x] `POST /api/v1/auth/refresh` — valida tipo "refresh", devuelve nuevo par
- [x] `get_current_user` actualizado: valida tipo "access" + carga User real desde DB

### Verificación ✅
- Register → access + refresh tokens
- Login → access + refresh tokens
- `GET /me` con access token → usuario completo
- `POST /refresh` con refresh token → nuevos tokens
- `GET /me` con token refrescado → funciona
- Access token usado como refresh → HTTP 401
- Contraseña incorrecta → HTTP 401

---

## Fase 3 — Providers reales ✅ COMPLETA (2026-06-11)

### 3.1 Binance ✅
- [x] Firma HMAC-SHA256 correcta (`hmac.new` con key/msg bytes)
- [x] `authenticate()` usa endpoint firmado `/api/v3/account` (no el ping público)
- [x] `BinancePricesClient` — precios USDT por símbolo, stablecoins hardcodeadas a 1.0
- [x] `BinanceHoldingsMapper` enriquece holdings con precios reales
- [x] `get_total_balance()` derivado de holdings (evita doble llamada a API)

### 3.2 MercadoPago ✅
- [x] `authenticate()` via `/v1/users/me`
- [x] Balance via `/v1/users/{user_id}/mercadopago_account/balance`
- [x] Conversión ARS→USD via `ExchangeRateService` (bluelytics.com.ar, dólar blue)
- [x] Holdings incluyen billetera ARS + inversiones FCI

### 3.3 BullMarket ✅ (implementación pendiente de API real)
- [x] Estructura completa implementada con endpoints de API interna (capturados con proxy)
- [x] Conversión ARS→USD via `ExchangeRateService`
- [x] Documentado: no tiene API pública, puede romperse; CSV import como alternativa pendiente

### Nuevo: ExchangeRateService ✅
- [x] `infrastructure/prices/exchange_rate_service.py` — bluelytics.com.ar
- [x] `get_ars_to_usd()` y `get_usd_to_ars()` (dólar blue sell rate)

### Fixes aplicados
- `AddIntegration` usaba `str(dict)` para encriptar → corregido a `json.dumps`
- `GetAggregatedPortfolio` agrega `get_holdings()` y `get_performance()` en paralelo
- Log de providers fallidos sin romper el aggregate

### Verificación ✅
- Credenciales Binance falsas → HTTP 400 ✓
- Credenciales MercadoPago falsas → HTTP 400 ✓
- Provider desconocido → HTTP 422 ✓
- `GET /integrations/` lista correctamente ✓
- `DELETE /integrations/{id}` elimina y rechaza integración ajena ✓
- Dashboard sin integraciones → `{total_usd: 0, providers: []}` ✓

---

## Fase 4 — Dashboard y snapshots ✅ COMPLETA (2026-06-11)

### 4.1 Portfolio aggregation ✅
- [x] Auto-snapshot al consultar dashboard (await directo, no create_task — session se cierra antes)
- [x] Performance calculada comparando con snapshots: `find_nearest_before(now-23h)` y `now-29d`
- [x] `change_pct_24h` y `change_pct_30d` en `PortfolioSummaryDTO`
- [x] Early-return por integraciones vacías movido — performance se calcula siempre

### 4.2 Historial ✅
- [x] `GET /api/v1/dashboard/history?from=&to=` (defaults: 30d atrás → ahora)
- [x] `PortfolioHistoryDTO` con puntos + cambios porcentuales del rango
- [x] `POST /api/v1/dashboard/refresh` — invalida caché y fuerza recarga
- [x] `find_nearest_before()` agregado al repo y a la interfaz del dominio

### Nuevos archivos
- `application/dtos/portfolio/portfolio_history_dto.py`
- `infrastructure/prices/exchange_rate_service.py` (bluelytics ARS/USD)

---

## Fase 5 — Calidad y producción ✅ COMPLETA (2026-06-10)

### 5.1 Tests ✅
- [x] Unit tests: domain entities y value objects — 13 tests (Money, Percentage, Holding)
- [x] Unit tests: use cases con mocks — 13 tests (RegisterUser, LoginUser, GetAggregatedPortfolio)
- [x] 26/26 passing, 0 failures
- [ ] Integration tests: providers contra APIs reales (marcados con `@pytest.mark.integration`) — pendiente

### 5.2 Observabilidad ✅
- [x] Logging estructurado: `logging.basicConfig` con formato timestamp/level/name en `app.py`
- [x] Health check endpoint `GET /health` → `{status: "ok", version: "0.1.0"}`
- [ ] Métricas de tiempo por provider — pendiente

### 5.3 Docker ✅
- [x] `Dockerfile` — Python 3.13-slim, Poetry, PYTHONPATH=/app/src
- [x] `docker-compose.prod.yml` — postgres + redis + backend con healthchecks y `alembic upgrade head` al arrancar
- [x] Variables de entorno via `.env` + `${VAR}` overrides en compose

### Fix aplicado
- `LoginUser.execute` construía `TokenDTO` con solo `access_token` (incompleto). Corregido: `create_token_fn` ahora retorna tuple `(access, refresh)` y el use case construye el `TokenDTO` completo.

---

## Decisiones pendientes

| Decisión | Opciones | Notar |
|----------|----------|-------|
| Tipo de cambio ARS/USD | BCCh API, dolarito.ar, manual | Afecta MercadoPago y BullMarket |
| BullMarket API | Oficial vs scraping | Confirmar si hay API REST |
| Refresh token storage | Redis blacklist vs DB | Redis más simple |
| Deploy | Railway, Render, VPS propio | TBD |
