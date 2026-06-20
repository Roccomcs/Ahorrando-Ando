import hashlib
import os
import secrets

from redis.asyncio import Redis

_CODE_TTL = 900  # 15 minutos


class RedisVerificationService:
    def __init__(self) -> None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis = Redis.from_url(url, decode_responses=True)

    def _key(self, email: str) -> str:
        digest = hashlib.sha256(email.lower().encode()).hexdigest()
        return f"email_verify:{digest}"

    def _attempts_key(self, email: str) -> str:
        digest = hashlib.sha256(email.lower().encode()).hexdigest()
        return f"email_verify_attempts:{digest}"

    async def generate_and_store(self, email: str) -> str:
        code = str(secrets.randbelow(900000) + 100000)  # 6 dígitos [100000, 999999]
        key = self._key(email)
        await self._redis.setex(key, _CODE_TTL, code)
        await self._redis.delete(self._attempts_key(email))
        return code

    async def verify(self, email: str, code: str) -> bool:
        key = self._key(email)
        attempts_key = self._attempts_key(email)

        attempts = int(await self._redis.get(attempts_key) or 0)
        if attempts >= 5:
            return False

        stored = await self._redis.get(key)
        if not stored or stored != code.strip():
            await self._redis.incr(attempts_key)
            await self._redis.expire(attempts_key, _CODE_TTL)
            return False

        await self._redis.delete(key)
        await self._redis.delete(attempts_key)
        return True
