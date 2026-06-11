# Estado del proyecto — Ahorrando Ando
> Última actualización: 2026-06-11. Todas las fases (6–11) completadas.

---

## Qué es

Agregador de portfolio financiero personal. El usuario conecta sus cuentas (Binance, MercadoPago, IOL, Lemon Cash, BullMarket, wallets on-chain) y ve todo en un solo dashboard en USD.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + SQLAlchemy 2.0 async + asyncpg, Python 3.13 |
| Arquitectura | Hexagonal (domain → application → infrastructure → interfaces) |
| Auth | JWT: access token 1h (cookie normal) + refresh token 30d (httpOnly cookie) |
| DB | PostgreSQL (asyncpg), Alembic async migrations |
| Cache / blacklist / rate limit | Redis |
| Encriptación credenciales | Fernet simétrico |
| Password hashing | bcrypt directo (sin passlib — incompatible con bcrypt>=4) |
| Email alertas | Resend API (httpx directo, no SDK) |
| Web Push | pywebpush + VAPID keys |
| Scheduler | APScheduler 3.x (AsyncIOScheduler) |
| Frontend | Next.js 16 App Router + TypeScript + Tailwind CSS |
| Data fetching | TanStack Query v5 |
| Gráficos | Recharts |
| HTTP client frontend | axios con interceptor 401→refresh automático |

---

## Estructura de carpetas clave

```
apps/
  backend/
    src/
      domain/
        entities/         user, portfolio, holding, audit_log, price_alert, push_subscription
        repositories/     interfaces abstractas (i_*.py)
        value_objects/    money, percentage, provider_type
      application/
        use_cases/
          auth/           register_user, login_user
          portfolio/      get_aggregated_portfolio, get_portfolio_history, refresh_portfolio_data
          alerts/         create_alert, delete_alert, check_alerts, weekly_summary
          analytics/      get_allocation, get_roi, get_benchmark, export_csv
        ports/            i_financial_provider, i_price_service, i_token_blacklist_service,
                          i_notification_service, i_push_service
      infrastructure/
        database/postgres/
          models/         user, integration, portfolio_snapshot, audit_log, price_alert, push_subscription
          repositories/   postgres_*.py (6 repositorios)
        providers/        binance/, bullmarket/, iol/, lemoncash/, mercadopago/, onchain/
                          registry.py  ← único lugar para registrar providers
        prices/           coingecko_price_service.py
        cache/            redis_cache_service.py, redis_token_blacklist_service.py
        encryption/       fernet_encryption_service.py
        notifications/    resend_notification_service.py, web_push_service.py
        scheduler/        alert_scheduler.py  ← arranca con la app
      interfaces/http/
        routers/          auth, dashboard, integrations, alerts, health
        controllers/      auth_controller, dashboard_controller, alerts_controller
        middlewares/      rate_limiter.py (Redis ZSET sliding window), error_handler.py
        dependencies/     get_current_user.py, get_db_session.py
  frontend/
    app/
      (auth)/             login/, register/
      (dashboard)/        dashboard/, history/, integrations/, alerts/, analytics/, settings/
      api/auth/refresh/   route.ts  ← Server Route Handler para refresh httpOnly cookie
    components/ui/        button, input, card
    components/           Sidebar.tsx
    hooks/                usePortfolio.ts  ← todos los TanStack Query hooks
    lib/                  api.ts (axios + interceptors), auth-context.tsx, types.ts
    proxy.ts              ← Next.js 16: reemplaza middleware.ts, export es `proxy` no `middleware`
.github/workflows/        ci.yml, cd-railway.yml, cd-vps.yml
docker-compose.prod.yml   Traefik + postgres + redis + backend + frontend
scripts/
  rotate_encryption_key.py
```

---

## API endpoints (26 rutas)

### Auth `/api/v1/auth`
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/register` | Registro usuario |
| POST | `/login` | Login → devuelve TokenPair |
| POST | `/refresh` | Rota refresh token (blacklist el viejo) |
| POST | `/logout` | Blacklist refresh token activo |
| GET | `/audit` | Últimos 50 eventos del usuario |

### Dashboard `/api/v1/dashboard`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Portfolio agregado (con caché Redis) |
| POST | `/refresh` | Invalida caché y recarga providers |
| GET | `/history` | Historial de snapshots (params: from, to) |
| GET | `/allocation` | Breakdown por activo / broker / tipo |
| GET | `/roi` | Rendimiento por holding |
| GET | `/benchmark` | Compara portfolio vs BTC/ETH (params: asset, period) |
| GET | `/export` | Descarga CSV de snapshots (param: days) |

### Integrations `/api/v1/integrations`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Lista integraciones del usuario |
| POST | `/` | Agrega integración con credenciales encriptadas |
| DELETE | `/{id}` | Elimina integración |

### Alerts `/api/v1/alerts`
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `` | Lista alertas del usuario |
| POST | `` | Crea alerta (asset_symbol, threshold_usd, direction) |
| DELETE | `/{id}` | Elimina alerta |
| POST | `/push/subscribe` | Registra suscripción Web Push |
| POST | `/push/unsubscribe` | Elimina suscripción Web Push |

---

## Providers financieros

| Provider | Auth | Activos |
|----------|------|---------|
| Binance | API Key + Secret (HMAC) | Crypto |
| MercadoPago | Access Token | Fiat + inversiones |
| Lemon Cash | API Key Bearer | Crypto |
| IOL (InvertirOnline) | OAuth2 usuario/pass, token 20min auto-refresh | Acciones, bonos, CEDEARs, FCI |
| BullMarket | Usuario/pass | Acciones (endpoints internos, puede romperse) |
| Onchain (ETH/MATIC) | Dirección pública + Etherscan API Key | ETH, ERC-20 tokens via tokentx |

---

## Migraciones Alembic

```
6cf5366204ef  initial_schema          (users, integrations, portfolio_snapshots)
86346ea3e929  add_audit_logs_table
c4f812a9d001  add_price_alerts_and_push_subscriptions
```

Para aplicar: `poetry run alembic upgrade head`

---

## Jobs programados (APScheduler)

| Job | Trigger | Función |
|-----|---------|---------|
| `check_alerts` | Cada 5 min | Verifica precios CoinGecko, dispara email + push si se cruza umbral |
| `weekly_summary` | Lunes 9:00 AM | Email resumen semanal a todos los usuarios |

Arrancan automáticamente en el evento `startup` de FastAPI.

---

## Variables de entorno

### Backend (`apps/backend/.env`)
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/ahorrando
REDIS_URL=redis://localhost:6379
JWT_SECRET=...
ENCRYPTION_KEY=...           # Fernet base64
ETHERSCAN_API_KEY=           # Opcional, para wallets on-chain
SENTRY_DSN=                  # Opcional
RESEND_API_KEY=              # Opcional, para emails de alertas
NOTIFICATION_FROM_EMAIL=alertas@ahorrandoando.app
VAPID_PRIVATE_KEY=           # Opcional, para web push
VAPID_PUBLIC_KEY=
VAPID_EMAIL=mailto:admin@ahorrandoando.app
```

### Frontend (`apps/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # Opcional, para web push
```

---

## Decisiones técnicas importantes

- **bcrypt directo** (no passlib): passlib es incompatible con bcrypt>=4
- **Next.js 16 Proxy**: el archivo es `proxy.ts` y el export es `proxy` (no `middleware`)
- **Access token en cookie normal**, refresh token en httpOnly cookie. El interceptor axios lee `access_token`; en 401 llama al Route Handler `/api/auth/refresh` que puede leer la cookie httpOnly y llamar al backend
- **SQLAlchemy reserva `metadata`**: usar `extra_data` en los modelos ORM
- **IOL token expira en 20 min**: el `IolAuthClient` refresca a los 18 min (`TOKEN_TTL_SECONDS = 18 * 60`)
- **Etherscan API free tier**: no hay endpoint de "todos los balances" → se usa `tokentx` para descubrir qué tokens conocidos tiene la wallet, luego se pide el balance individual de cada uno
- **Rate limiting**: Redis ZSET sliding window. Límites: 20 req/min IP pública, 120 req/min usuario autenticado
- **Formatter Recharts**: el parámetro `value` es `ValueType | undefined`, siempre castear con `Number(value)`, nunca tipar como `number`

---

## Comandos útiles

```powershell
# Compilar backend y ver rutas
cd apps/backend
$env:PYTHONPATH="src"
.\.venv\Scripts\python.exe -c "from interfaces.http.app import create_app; app = create_app(); print(len(list(app.routes)), 'routes')"

# Unit tests
.\.venv\Scripts\python.exe -m pytest tests/unit/ -q

# TypeScript check frontend
cd apps/frontend
npx tsc --noEmit

# Nueva migración (requiere Postgres corriendo)
cd apps/backend
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "descripcion"
.\.venv\Scripts\python.exe -m alembic upgrade head

# Generar VAPID keys para web push
.\.venv\Scripts\python.exe -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print('Private:', v.private_key); print('Public:', v.public_key)"

# Rotar encryption key
.\.venv\Scripts\python.exe scripts/rotate_encryption_key.py --old-key OLD --new-key NEW
```

---

## Estado de las fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| 1–5 | Backend core (auth, portfolio, providers Binance/MP/BullMarket, tests, health) | ✅ |
| 6 | Seguridad: blacklist, rate limiting, audit log, rotación de keys | ✅ |
| 7 | Providers: Lemon Cash, IOL, wallet on-chain (ETH/MATIC) | ✅ |
| 8 | Frontend Next.js 16 completo | ✅ |
| 9 | Alertas de precio + email (Resend) + web push + resumen semanal | ✅ |
| 10 | Deploy: Docker Compose + Traefik + GitHub Actions CI/CD | ✅ |
| 11 | Analytics: allocation pie, tabla ROI, benchmark vs BTC/ETH, export CSV | ✅ |

---

## Prioridades del plan ejecutadas

| Prioridad | Descripción | Estado |
|-----------|-------------|--------|
| P1 | Bugs: `utcnow()`, validación credenciales, rutas duplicadas | ✅ |
| P2 | Testing: 63 unit tests, HTTP tests, integration stubs | ✅ |
| P3 | Seguridad: CORS prod, input validation, retry smart, circuit breaker | ✅ |
| P4 | UX: error state integración, sync manual, change pw, delete account, onboarding, history 1y, alert badge | ✅ |

## Deuda técnica conocida

| Item | Urgencia |
|------|----------|
| BullMarket usa endpoints internos sin API pública — puede romperse | Media |
| Integration tests y e2e requieren Postgres + Redis reales | Media |
| Balanz no tiene API pública — marcado como pendiente/experimental | Baja |
