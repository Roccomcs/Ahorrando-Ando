import os
import time

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

router = APIRouter(tags=["Health"])

VERSION = "0.1.0"


class HealthResponse(BaseModel):
    status: str
    version: str = VERSION


class ReadinessResponse(BaseModel):
    status: str
    version: str = VERSION
    checks: dict[str, str]
    latency_ms: float


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness: la app está corriendo."""
    return HealthResponse(status="ok")


@router.get("/health/live", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    """Liveness probe para Kubernetes/Docker."""
    return HealthResponse(status="ok")


@router.get("/health/ready", response_model=ReadinessResponse)
async def readiness() -> ReadinessResponse:
    """Readiness probe: verifica conexiones a DB y Redis."""
    from infrastructure.cache.redis_cache_service import RedisCacheService
    from infrastructure.database.postgres.connection import AsyncSessionFactory

    checks: dict[str, str] = {}
    t0 = time.monotonic()

    # Check Postgres
    try:
        async with AsyncSessionFactory() as session:
            await session.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as e:
        checks["postgres"] = f"error: {e}"

    # Check Redis
    try:
        cache = RedisCacheService()
        await cache._redis.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {e}"

    latency_ms = round((time.monotonic() - t0) * 1000, 1)
    all_ok = all(v == "ok" for v in checks.values())

    return ReadinessResponse(
        status="ok" if all_ok else "degraded",
        checks=checks,
        latency_ms=latency_ms,
    )
