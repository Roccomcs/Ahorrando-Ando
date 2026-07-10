import hashlib
import os
import secrets
from dataclasses import dataclass

from redis.asyncio import Redis

_CODE_TTL = 900  # 15 minutos
MAX_ATTEMPTS = 5
MAX_RESENDS = 5


@dataclass(frozen=True)
class VerifyResult:
    ok: bool
    """Intentos que le quedan al usuario antes del bloqueo. 0 = bloqueado."""
    attempts_left: int


class RedisVerificationService:
    def __init__(self, namespace: str = "email_verify") -> None:
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self._redis = Redis.from_url(url, decode_responses=True)
        self._ns = namespace

    def _digest(self, email: str) -> str:
        return hashlib.sha256(email.lower().encode()).hexdigest()

    def _key(self, email: str) -> str:
        return f"{self._ns}:{self._digest(email)}"

    def _attempts_key(self, email: str) -> str:
        return f"{self._ns}_attempts:{self._digest(email)}"

    def _resends_key(self, email: str) -> str:
        return f"{self._ns}_resends:{self._digest(email)}"

    async def generate_and_store(self, email: str) -> str | None:
        """Genera un código nuevo, o `None` si se agotaron los reenvíos.

        El contador de intentos fallidos NO se reinicia acá: si lo hiciera,
        pedir un código nuevo devolvería los 5 intentos y el tope no serviría
        de nada. Se limita en cambio la cantidad de códigos por ventana.
        """
        resends = await self._redis.incr(self._resends_key(email))
        if resends == 1:
            await self._redis.expire(self._resends_key(email), _CODE_TTL)
        if resends > MAX_RESENDS:
            return None

        code = str(secrets.randbelow(900000) + 100000)  # 6 dígitos [100000, 999999]
        await self._redis.setex(self._key(email), _CODE_TTL, code)
        return code

    async def verify(self, email: str, code: str) -> VerifyResult:
        key = self._key(email)
        attempts_key = self._attempts_key(email)

        attempts = int(await self._redis.get(attempts_key) or 0)
        if attempts >= MAX_ATTEMPTS:
            return VerifyResult(ok=False, attempts_left=0)

        stored = await self._redis.get(key)
        if not stored or stored != code.strip():
            attempts = await self._redis.incr(attempts_key)
            await self._redis.expire(attempts_key, _CODE_TTL)
            left = max(MAX_ATTEMPTS - attempts, 0)
            if left == 0:
                # Quemado el último intento, el código deja de servir aunque
                # después lo adivinen: hay que pedir uno nuevo.
                await self._redis.delete(key)
            return VerifyResult(ok=False, attempts_left=left)

        await self._redis.delete(key, attempts_key, self._resends_key(email))
        return VerifyResult(ok=True, attempts_left=MAX_ATTEMPTS)
