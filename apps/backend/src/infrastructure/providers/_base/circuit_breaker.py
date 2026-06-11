"""
Circuit breaker por provider.

Estados:
  CLOSED   → llamadas pasan normal
  OPEN     → llamadas bloqueadas durante `recovery_seconds`
  HALF_OPEN → una llamada de prueba; si falla vuelve a OPEN

Uso:
    cb = CircuitBreaker("binance")
    async with cb:
        result = await provider.get_holdings()
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class _State(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass
class _Breaker:
    failures: int = 0
    state: _State = _State.CLOSED
    opened_at: float = 0.0


_registry: dict[str, _Breaker] = {}
_lock = asyncio.Lock()

FAILURE_THRESHOLD = 3     # abre después de N fallos consecutivos
RECOVERY_SECONDS = 120    # 2 minutos en OPEN antes de probar de nuevo


class CircuitBreakerOpen(Exception):
    def __init__(self, provider: str) -> None:
        super().__init__(f"Circuit breaker abierto para '{provider}' — esperando recuperación")
        self.provider = provider


class CircuitBreaker:
    def __init__(self, provider_name: str) -> None:
        self._name = provider_name
        if provider_name not in _registry:
            _registry[provider_name] = _Breaker()

    @property
    def _b(self) -> _Breaker:
        return _registry[self._name]

    def is_open(self) -> bool:
        b = self._b
        if b.state == _State.OPEN:
            if time.monotonic() - b.opened_at >= RECOVERY_SECONDS:
                b.state = _State.HALF_OPEN
                return False
            return True
        return False

    def record_success(self) -> None:
        b = self._b
        b.failures = 0
        b.state = _State.CLOSED

    def record_failure(self) -> None:
        b = self._b
        b.failures += 1
        if b.failures >= FAILURE_THRESHOLD or b.state == _State.HALF_OPEN:
            b.state = _State.OPEN
            b.opened_at = time.monotonic()
            logger.warning("Circuit breaker ABIERTO para '%s' tras %d fallos", self._name, b.failures)

    async def __aenter__(self) -> "CircuitBreaker":
        if self.is_open():
            raise CircuitBreakerOpen(self._name)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> bool:
        if exc_type is None:
            self.record_success()
        elif exc_type is not CircuitBreakerOpen:
            self.record_failure()
        return False  # no suprime la excepción
