# 📖 Referencia Rápida — Índice de Archivos y Endpoints

## Índice por Funcionalidad

### 🔐 Autenticación

#### Backend
- **Entry point**: `apps/backend/src/interfaces/http/app.py`
- **Router**: `interfaces/http/routers/auth_router.py`
- **Controller**: `interfaces/http/controllers/auth_controller.py`
- **Use Cases**: 
  - `application/use_cases/auth/register_user.py` → crear usuario + enviar OTP
  - `application/use_cases/auth/login_user.py` → login con email/password
  - `application/use_cases/auth/google_oauth.py` → intercambiar código por tokens
  - `application/use_cases/auth/refresh_token.py` → generar nuevo access token
- **Modelos**: `infrastructure/database/postgres/models/user_model.py`
- **DTO**: `application/dtos/auth/{login_dto, register_dto, user_dto}.py`
- **Middleware**: `interfaces/http/middlewares/authenticate.py` → valida JWT

#### Frontend
- **Auth Context**: `lib/auth-context.tsx`
- **Login Page**: `app/auth/login/page.tsx`
- **Register Page**: `app/auth/register/page.tsx`
- **Verify Page**: `app/auth/verify/page.tsx`
- **Middleware**: `middleware.ts` → protege rutas

---

### 💼 Portfolio y Integrations

#### Backend
- **Use Cases**:
  - `application/use_cases/portfolio/get_aggregated_portfolio.py` → fetch y agregar holdings
  - `application/use_cases/integrations/add_integration.py` → crear integración
  - `application/use_cases/integrations/remove_integration.py` → borrar integración

- **Controllers**:
  - `interfaces/http/controllers/dashboard_controller.py` → portfolio + history
  - `interfaces/http/controllers/integrations_controller.py` → CRUD integrations

#### Frontend
- **Hooks**: `hooks/usePortfolio.ts`
  - `usePortfolio()` → fetch portfolio summary
  - `useIntegrations()` → fetch + mutations add/remove
  - `useAssetLogo()` → fetch logo
  - `useAssetHistory()` → serie histórica de precios

---

## API Endpoints — Referencia Completa

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/google
POST   /api/v1/auth/refresh
POST   /api/v1/auth/verify
POST   /api/v1/auth/change-password
POST   /api/v1/auth/logout
DELETE /api/v1/auth/account
```

### Dashboard
```
GET    /api/v1/dashboard/portfolio
GET    /api/v1/dashboard/history?days=30
GET    /api/v1/dashboard/allocation
GET    /api/v1/dashboard/roi
GET    /api/v1/dashboard/benchmark
GET    /api/v1/dashboard/provider-performance
```

### Integrations
```
GET    /api/v1/integrations
POST   /api/v1/integrations
PATCH  /api/v1/integrations/{integration_id}
DELETE /api/v1/integrations/{integration_id}
POST   /api/v1/integrations/{integration_id}/sync
POST   /api/v1/integrations/{integration_id}/import
```

### Assets
```
GET    /api/v1/assets/search?q=BTC
GET    /api/v1/assets/logo?symbol=BTC&category=crypto
GET    /api/v1/assets/history?category=crypto&ref=bitcoin&days=30
```

### Transactions
```
GET    /api/v1/transactions?days=30
POST   /api/v1/transactions
PATCH  /api/v1/transactions/{transaction_id}
DELETE /api/v1/transactions/{transaction_id}
```

### Alerts
```
GET    /api/v1/alerts
POST   /api/v1/alerts
DELETE /api/v1/alerts/{alert_id}
```

---

## Hooks Principales
```typescript
useAuth()                              // Auth context
usePortfolio()                         // portfolio summary
usePortfolioHistory(days)              // histórico
useIntegrations()                      // integrations CRUD
useAssetLogo(symbol, category)         // logo resolver
useAssetHistory(category, ref, days)   // precio histórico
useTransactions(days, txType)          // movimientos
searchAssets(query)                    // búsqueda activos
invalidatePortfolio(qc, userId)       // invalida caches
```

---

## Variables de Entorno Críticas

### Backend (`.env`)
```
JWT_SECRET=<clave-segura>              # Firmar/verificar JWTs
ENCRYPTION_KEY=<fernet-key>            # Encriptar credentials
DATABASE_URL=postgresql+asyncpg://...  # Postgres async
REDIS_URL=redis://...                  # Cache
RESEND_API_KEY=<api-key>              # Email service
GOOGLE_CLIENT_ID=<oauth-id>
GOOGLE_CLIENT_SECRET=<oauth-secret>
ENV=production|development
ALLOWED_ORIGINS=http://...,https://...
SENTRY_DSN=<sentry-dsn>
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<oauth-id>
```

---

**Este es tu índice rápido. Para más detalles:**
- **Saber dónde está X funcionalidad** → busca por nombre aquí
- **Entender cómo se hace Y** → ve a `ARQUITECTURA_COMPLETA.md`
- **Ver detalles de Z** → ve a `FLUJOS_AVANZADOS.md`
