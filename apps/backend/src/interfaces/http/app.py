import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

# Entry point de toda la API

# Carga el .env desde apps/backend/.env
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

# Obtenemos el JWT_SECRET y verificamos que no sea inseguro
import sys
_jwt_secret = os.getenv("JWT_SECRET", "")
if not _jwt_secret or _jwt_secret == "changeme":
    print("ERROR: JWT_SECRET no está configurado o usa el valor por defecto inseguro. Abortando.", file=sys.stderr)
    sys.exit(1)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import infrastructure.database.postgres.models  # noqa: F401 — registra todos los modelos para que SQLAlchemy resuelva las FK
from infrastructure.scheduler.alert_scheduler import start_scheduler, stop_scheduler
from interfaces.http.middlewares.error_handler import add_error_handlers
from interfaces.http.routers.alerts_router import router as alerts_router
from interfaces.http.routers.assets_router import router as assets_router
from interfaces.http.routers.auth_router import router as auth_router
from interfaces.http.routers.dashboard_router import router as dashboard_router
from interfaces.http.routers.health_router import router as health_router
from interfaces.http.routers.integrations_router import router as integrations_router
from interfaces.http.routers.transactions_router import router as transactions_router

# Configuración de logging en formato JSON
from pythonjsonlogger.json import JsonFormatter

_handler = logging.StreamHandler()
_handler.setFormatter(JsonFormatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
logging.basicConfig(level=logging.INFO, handlers=[_handler])


# Sincroniza la estructura de la DB con lo que el código necesita
# SQLAlchemy = permite trabajar con la DB usando objetos Python en lugar de SQL strings
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


# Es el ciclo de vida de la aplicación, se ejecuta al iniciar y al cerrar la app. Aquí se ejecutan las migraciones, se inicia el scheduler, el servidor está listo para recibir requests, y al cerrar se detiene el scheduler.
@asynccontextmanager
async def _lifespan(app: FastAPI):
    await _run_db_migrations()
    start_scheduler()
    yield
    stop_scheduler()


# Función para crear la aplicación FastAPI
# FastAPI es un framework web moderno y rápido para construir APIs con Python, es una libreria que nos permite:
# Definir endpoints (rutas) con decoradores (@app.get("/users"))
# Validar datos automáticamente
# Generar documentación Swagger automática
# Soportar async/await nativo

def create_app() -> FastAPI:

    # Creamos la instancia de FastAPI con un título y versión, y le pasamos el lifespan para manejar el ciclo de vida de la aplicación
    app = FastAPI(title="Ahorrando Ando API", version="0.1.0", lifespan=_lifespan)

    # Configuración de CORS (Cross-Origin Resource Sharing)
    _env = os.getenv("ENV", "production")
    _raw_origins = os.getenv("ALLOWED_ORIGINS", "")
    _origins_list = [o.strip() for o in _raw_origins.split(",") if o.strip()]

    # En desarrollo permitimos localhost explícitamente (nunca wildcard con credentials)
    if _env == "development" and not _origins_list:
        _origins_list = ["http://localhost:3000", "http://localhost:8000"]

    # En producción, si no hay ALLOWED_ORIGINS configurado, abortamos para evitar problemas de seguridad
    elif not _origins_list:
        print("ERROR: ALLOWED_ORIGINS no está configurado en producción. Abortando.", file=sys.stderr)
        sys.exit(1)

    # Agregamos los manejadores de errores personalizados para que la API devuelva respuestas consistentes y amigables en caso de errores
    add_error_handlers(app)

    # Agregamos el middleware de rate limiting para limitar la cantidad de requests por IP y evitar abusos
    from interfaces.http.middlewares.rate_limiter import RateLimiterMiddleware
    app.add_middleware(RateLimiterMiddleware)

    # Agregamos el middleware de CORS para permitir que la API sea consumida desde los orígenes permitidos
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # Registramos los routers de los distintos módulos de la API, cada uno con su prefijo correspondiente
    app.include_router(health_router)
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(dashboard_router, prefix="/api/v1")
    app.include_router(integrations_router, prefix="/api/v1")
    app.include_router(alerts_router, prefix="/api/v1")
    app.include_router(assets_router, prefix="/api/v1")
    app.include_router(transactions_router, prefix="/api/v1")

    return app


app = create_app()
