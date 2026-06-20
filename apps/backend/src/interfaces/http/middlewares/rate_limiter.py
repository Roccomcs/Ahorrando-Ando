import os
import time

from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

# Límites diferenciados por tipo de endpoint
_PUBLIC_PATHS = {"/api/v1/auth/login", "/api/v1/auth/register"}
PUBLIC_MAX = 20       # 20 req/min en endpoints públicos (evita brute-force)
AUTHED_MAX = 120      # 120 req/min para usuarios autenticados
WINDOW_SECONDS = 60

_redis: Redis | None = None


def _get_redis() -> Redis:
    global _redis
    if _redis is None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis = Redis.from_url(url, decode_responses=True)
    return _redis


class RateLimiterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Usar la IP real del cliente, no la IP del proxy
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # El primer elemento es la IP original del cliente
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        max_requests = PUBLIC_MAX if path in _PUBLIC_PATHS else AUTHED_MAX

        key = f"rate_limit:{client_ip}:{path}"
        now = time.time()
        window_start = now - WINDOW_SECONDS

        redis = _get_redis()
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, WINDOW_SECONDS + 1)
        results = await pipe.execute()

        current_count = results[1]
        if current_count >= max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Demasiadas solicitudes. Intentá de nuevo en un minuto."},
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(max(0, max_requests - current_count - 1))
        return response
