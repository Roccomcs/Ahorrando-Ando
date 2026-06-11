import pytest

from infrastructure.providers._base.circuit_breaker import (
    CircuitBreaker,
    CircuitBreakerOpen,
    FAILURE_THRESHOLD,
    _registry,
)


def _reset(name: str) -> None:
    """Limpia el estado del breaker entre tests."""
    _registry.pop(name, None)


@pytest.mark.asyncio
async def test_closed_by_default():
    _reset("test_closed")
    cb = CircuitBreaker("test_closed")
    assert not cb.is_open()


@pytest.mark.asyncio
async def test_opens_after_threshold_failures():
    _reset("test_open")
    cb = CircuitBreaker("test_open")
    for _ in range(FAILURE_THRESHOLD):
        cb.record_failure()
    assert cb.is_open()


@pytest.mark.asyncio
async def test_closed_after_success():
    _reset("test_success")
    cb = CircuitBreaker("test_success")
    cb.record_failure()
    cb.record_failure()
    cb.record_success()
    assert not cb.is_open()
    assert cb._b.failures == 0


@pytest.mark.asyncio
async def test_context_manager_raises_when_open():
    _reset("test_ctx_open")
    cb = CircuitBreaker("test_ctx_open")
    for _ in range(FAILURE_THRESHOLD):
        cb.record_failure()

    with pytest.raises(CircuitBreakerOpen):
        async with cb:
            pass


@pytest.mark.asyncio
async def test_context_manager_records_failure_on_exception():
    _reset("test_ctx_fail")
    cb = CircuitBreaker("test_ctx_fail")

    with pytest.raises(ValueError):
        async with cb:
            raise ValueError("fallo del provider")

    assert cb._b.failures == 1


@pytest.mark.asyncio
async def test_context_manager_records_success():
    _reset("test_ctx_ok")
    cb = CircuitBreaker("test_ctx_ok")
    cb.record_failure()

    async with cb:
        pass  # éxito

    assert cb._b.failures == 0
