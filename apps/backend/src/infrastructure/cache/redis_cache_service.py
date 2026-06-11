import json
import os
from typing import Any

from redis.asyncio import Redis

from application.ports.i_cache_service import ICacheService


class RedisCacheService(ICacheService):
    def __init__(self, redis_url: str | None = None) -> None:
        url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis = Redis.from_url(url, decode_responses=True)

    async def get(self, key: str) -> Any | None:
        value = await self._redis.get(key)
        return json.loads(value) if value else None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._redis.setex(key, ttl, json.dumps(value))

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)
