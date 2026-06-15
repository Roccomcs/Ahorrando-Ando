import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Carga el .env desde apps/backend/.env (dos niveles arriba de src/)
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

import sys
_jwt_secret = os.getenv("JWT_SECRET", "changeme")
if _jwt_secret == "changeme" and os.getenv("ENV", "development") == "production":
    print("ERROR: JWT_SECRET no configurado en producción. Abortando.", file=sys.stderr)
    sys.exit(1)

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


@asynccontextmanager
async def _lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


def create_app() -> FastAPI:
    app = FastAPI(title="Ahorrando Ando API", version="0.1.0", lifespan=_lifespan)

    # ── Prometheus metrics ─────────────────────────────────────────────────────
    try:
        from prometheus_fastapi_instrumentator import Instrumentator
        Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)
    except ImportError:
        pass

    _env = os.getenv("ENV", "production")
    _raw_origins = os.getenv("ALLOWED_ORIGINS", "")
    if _env == "development" or not _raw_origins:
        _origins = ["*"]
    else:
        _origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

    add_error_handlers(app)

    from interfaces.http.middlewares.rate_limiter import RateLimiterMiddleware
    app.add_middleware(RateLimiterMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(integrations_router, prefix="/api/v1")
    app.include_router(alerts_router, prefix="/api/v1")

    return app


app = create_app()
