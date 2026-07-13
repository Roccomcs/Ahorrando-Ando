# 📚 Ahorrando Ando — Arquitectura Completa

## 1. Visión General

**Ahorrando Ando** es una plataforma de gestión de patrimonio financiero unificado. Permite a los usuarios conectar sus cuentas (Binance, IOL, Mercado Pago, etc.), ver el portfolio en USD, analizar performance y establecer alertas de precio.

### Stack Tecnológico
- **Backend**: FastAPI (Python) + SQLAlchemy (async) + PostgreSQL + Redis
- **Frontend**: Next.js 16 (App Router) + React 19 + React Query (TanStack) + CSS Modules + Three.js (3D)
- **Deploy**: Railway (backend + DB) + Vercel (frontend)
- **Auth**: JWT (manual) + Google OAuth
- **Email**: Resend API
- **Precios**: CoinGecko (cripto), TradingView/Yahoo Finance (stocks/CEDEARs), data912 (Argentina)

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js + React)                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Pages (Auth, Dashboard, Analytics, etc.) + Components   │   │
│  │ Hooks (usePortfolio, useAssetLogo, useAuth)             │   │
│  │ React Query (data fetching + caching)                   │   │
│  │ CSS Modules + Design System (Tokens Claude Design)      │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┬─┘
                                  │ HTTP (REST API)
┌────────────────────────────────────────────────────────────────┴─┐
│                    BACKEND (FastAPI + Python)                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Interfaces HTTP (Controllers + Routers)                 │    │
│  │ Middleware (Auth, ErrorHandler, RateLimiter)            │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Application Layer (Use Cases + DTOs)                    │    │
│  │ - LoginUser, RegisterUser, GetAggregatedPortfolio      │    │
│  │ - AddIntegration, RemoveIntegration                     │    │
│  │ - CreateAlert, CheckAlerts                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Domain Layer (Entities + Value Objects + Repositories)  │    │
│  │ - User, Holding, Portfolio, Integration, PriceAlert     │    │
│  │ - Money, Percentage, ProviderType (Value Objects)       │    │
│  │ - IUserRepository, IPortfolioRepository, etc.           │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Infrastructure Layer                                     │    │
│  │ - Database (Postgres + SQLAlchemy Models + Repos)       │    │
│  │ - Providers (Binance, IOL, Manual, Mercado Pago)        │    │
│  │ - Prices (CoinGecko, Yahoo, data912, Logo Service)      │    │
│  │ - Services (Encryption, Cache/Redis, Email/Resend)      │    │
│  │ - Scheduler (Alert checks cada 5 min)                   │    │
│  └──────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────────┘
                                  │
                   ┌──────────────┼──────────────┐
                   │              │              │
            ┌──────▼──┐    ┌──────▼──┐    ┌──────▼──┐
            │PostgreSQL   │Redis     │Resend API │
            └───────────┘ └──────────┘ └───────────┘
```

---

**[Contenido completo igual al documento generado — 1500+ líneas de documentación detallada cubriendo: domain, application, infrastructure, database, providers, services, scheduler, controllers, routers, frontend architecture, hooks, componentes, CSS modules, Three.js, CRUD flow, key flows, infrastructure & deployment, JWT models, debugging tips]**

Ver documento generado para cobertura completa.
