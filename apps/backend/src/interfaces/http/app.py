import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Carga el .env desde apps/backend/.env (dos niveles arriba de src/)
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

import sys
_jwt_secret = os.getenv("JWT_SECRET", "")
if not _jwt_secret or _jwt_secret == "changeme":
    print("ERROR: JWT_SECRET no está configurado o usa el valor por defecto inseguro. Abortando.", file=sys.stderr)
    sys.exit(1)

import sentry_sdk

_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        environment=os.getenv("ENV", "production"),
    )

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import infrastructure.database.postgres.models  # noqa: F401 — registra todos los modelos para que SQLAlchemy resuelva las FK
from infrastructure.scheduler.alert_scheduler import start_scheduler, stop_scheduler
from interfaces.http.middlewares.error_handler import add_error_handlers
from interfaces.http.routers.alerts_router import router as alerts_router
from interfaces.http.routers.auth_router import router as auth_router
from interfaces.http.routers.dashboard_router import router as dashboard_router
from interfaces.http.routers.health_router import router as health_router
from interfaces.http.routers.integrations_router import router as integrations_router

# ── Structured JSON logging ────────────────────────────────────────────────────
from pythonjsonlogger.json import JsonFormatter

_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[_handler])


async def _run_db_migrations() -> None:
    from sqlalchemy import text
    from infrastructure.database.postgres.connection import engine
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR"
        ))


@asynccontextmanager
async def _lifespan(app: FastAPI):
    await _run_db_migrations()
    start_scheduler()
    yield
    stop_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(title="Ahorrando Ando API", version="0.1.0", lifespan=_lifespan)

    # ── Prometheus metrics ─────────────────────────────────────────────────────
    _metrics_token = os.getenv("METRICS_SECRET_TOKEN", "")
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
        from starlette.responses import Response as _Resp

        _inst = Instrumentator().instrument(app)

        if _metrics_token:
            from fastapi import Depends, HTTPException, Header as _Header
            async def _metrics_auth(x_metrics_token: str = _Header(default="")):
                if x_metrics_token != _metrics_token:
                    raise HTTPException(status_code=403, detail="Forbidden")
            _inst.expose(app, endpoint="/metrics", include_in_schema=False, dependencies=[Depends(_metrics_auth)])
        else:
            _inst.expose(app, endpoint="/metrics", include_in_schema=False)
    except ImportError:
        pass

    _env = os.getenv("ENV", "production")
    _raw_origins = os.getenv("ALLOWED_ORIGINS", "")
    _origins_list = [o.strip() for o in _raw_origins.split(",") if o.strip()]

    if _env == "development" and not _origins_list:
        # En desarrollo permitimos localhost explícitamente (nunca wildcard con credentials)
        _origins_list = ["http://localhost:3000", "http://localhost:8000"]
    elif not _origins_list:
        print("ERROR: ALLOWED_ORIGINS no está configurado en producción. Abortando.", file=sys.stderr)
        sys.exit(1)

    add_error_handlers(app)

    from interfaces.http.middlewares.rate_limiter import RateLimiterMiddleware
    app.add_middleware(RateLimiterMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(integrations_router, prefix="/api/v1")
    app.include_router(alerts_router, prefix="/api/v1")

    return app


app = create_app()
