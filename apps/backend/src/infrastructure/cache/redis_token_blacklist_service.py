import hashlib
import os

from redis.asyncio import Redis

from application.ports.i_token_blacklist_service import ITokenBlacklistService


class RedisTokenBlacklistService(ITokenBlacklistService):
    def __init__(self, redis_url: str | None = None) -> None:
        url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis = Redis.from_url(url, decode_responses=True)

    def _key(self, token: str) -> str:
        digest = hashlib.sha256(token.encode()).hexdigest()
        return f"blacklist:refresh:{digest}"

    async def add(self, token: str, ttl_seconds: int) -> None:
        await self._redis.setex(self._key(token), ttl_seconds, "1")

    async def is_blacklisted(self, token: str) -> bool:
        return await self._redis.exists(self._key(token)) == 1
