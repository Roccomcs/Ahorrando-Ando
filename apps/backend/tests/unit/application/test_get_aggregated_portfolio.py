import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio
from domain.value_objects.money import Currency, Money


def _make_use_case(
    integrations=None,
    snap_24h=None,
    snap_30d=None,
    cached=None,
):
    integration_repo = AsyncMock()
    integration_repo.find_by_user.return_value = integrations or []

    snapshot_repo = AsyncMock()
    snapshot_repo.find_nearest_before.side_effect = [snap_24h, snap_30d]
    snapshot_repo.save.return_value = None

    encryption = MagicMock()
    encryption.decrypt.return_value = "{}"

    cache = AsyncMock()
    cache.get.return_value = cached
    cache.set.return_value = None

    registry = MagicMock()

    return GetAggregatedPortfolio(
        integration_repo=integration_repo,
        snapshot_repo=snapshot_repo,
        encryption_service=encryption,
        cache_service=cache,
        provider_registry=registry,
    )


@pytest.mark.asyncio
async def test_no_integrations_returns_zero():
    uc = _make_use_case()
    result = await uc.execute("user-1")
    assert result.total_usd == 0.0
    assert result.providers == []


@pytest.mark.asyncio
async def test_returns_cached_result():
    cached_data = {
        "total_usd": 999.0,
        "providers": [],
        "change_pct_24h": None,
        "change_pct_30d": None,
    }
    uc = _make_use_case(cached=cached_data)
    result = await uc.execute("user-1")
    assert result.total_usd == 999.0


@pytest.mark.asyncio
async def test_performance_calculated_with_snapshots():
    snap = MagicMock()
    snap.total_value = Money(amount=500.0, currency=Currency.USD)

    uc = _make_use_case(snap_24h=snap, snap_30d=snap)
    result = await uc.execute("user-1")

    # total_usd=0, old=500 → change = (0-500)/500*100 = -100%
    assert result.change_pct_24h == pytest.approx(-100.0)
    assert result.change_pct_30d == pytest.approx(-100.0)


@pytest.mark.asyncio
async def test_no_performance_when_no_snapshots():
    uc = _make_use_case()
    result = await uc.execute("user-1")
    assert result.change_pct_24h is None
    assert result.change_pct_30d is None
