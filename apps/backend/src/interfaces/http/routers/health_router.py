import os
import time

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

# Endpoints de salud del servidor para monitoreo. No requieren autenticación y no tienen prefijo /api/v1.
# GET /health y /health/live confirman que la app está corriendo (liveness).
# GET /health/ready verifica que Postgres y Redis estén disponibles (readiness).
router = APIRouter(tags=["Health"])

VERSION = "0.1.0"

# DTO de respuesta para liveness (solo status y versión)
class HealthResponse(BaseModel):
    status: str
    version: str = VERSION

# DTO de respuesta para readiness (incluye resultado de cada conexión y latencia total)
class ReadinessResponse(BaseModel):
    status: str
    version: str = VERSION
    checks: dict[str, str]
    latency_ms: float


# Endpoint básico de liveness: confirma que la app está corriendo
@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")


# Probe de liveness para Kubernetes/Docker (mismo comportamiento que /health)
@router.get("/health/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    return HealthResponse(status="ok")


# Probe de readiness: verifica que Postgres y Redis respondan antes de declarar el servidor listo
@router.get("/health/ready", response_model=ReadinessResponse)
async def readiness() -> ReadinessResponse:
    from infrastructure.cache.redis_cache_service import RedisCacheService
    from infrastructure.database.postgres.connection import AsyncSessionFactory

    checks: dict[str, str] = {}
    t0 = time.monotonic()

    # Verifica que Postgres responda con una query mínima
    try:
        async with AsyncSessionFactory() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:
        checks["postgres"] = f"error: {e}"

    # Verifica que Redis responda con un ping
    try:
        cache = RedisCacheService()
        await cache._redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    latency_ms = round((time.monotonic() - t0) * 1000, 1)
    all_ok = all(v == "ok" for v in checks.values())

    # Si alguna conexión falla, retorna "degraded" en vez de "ok"
    return ReadinessResponse(
        status="ok" if all_ok else "degraded",
        checks=checks,
        latency_ms=latency_ms,
    )
