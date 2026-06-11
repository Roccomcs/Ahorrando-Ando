import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from application.use_cases.analytics.export_csv import ExportCSV
from domain.entities.portfolio import Portfolio
from domain.value_objects.money import Currency, Money


def _make_snapshot(usd: float, dt: datetime) -> Portfolio:
    return Portfolio(
        user_id="user-1",
        total_value=Money(amount=usd, currency=Currency.USD),
        holdings=[],
        snapshot_at=dt,
    )


@pytest.mark.asyncio
async def test_export_csv_no_snapshots_returns_header_only():
    repo = AsyncMock()
    repo.find_by_user_between.return_value = []
    uc = ExportCSV(repo)
    csv = await uc.execute("user-1")
    lines = csv.strip().splitlines()
    assert len(lines) == 1
    assert lines[0] == "fecha,total_usd"


@pytest.mark.asyncio
async def test_export_csv_single_snapshot():
    dt = datetime(2026, 1, 15, 12, 0, tzinfo=None)
    repo = AsyncMock()
    repo.find_by_user_between.return_value = [_make_snapshot(5000.0, dt)]
    uc = ExportCSV(repo)
    csv = await uc.execute("user-1")
    lines = csv.strip().splitlines()
    assert len(lines) == 2
    assert "2026-01-15 12:00" in lines[1]
    assert "5000.00" in lines[1]


@pytest.mark.asyncio
async def test_export_csv_multiple_snapshots_ordered():
    snapshots = [
        _make_snapshot(1000.0, datetime(2026, 1, 1)),
        _make_snapshot(1500.0, datetime(2026, 1, 15)),
        _make_snapshot(2000.0, datetime(2026, 2, 1)),
    ]
    repo = AsyncMock()
    repo.find_by_user_between.return_value = snapshots
    uc = ExportCSV(repo)
    csv = await uc.execute("user-1")
    lines = csv.strip().splitlines()
    assert len(lines) == 4  # header + 3 rows
    assert "1000.00" in lines[1]
    assert "2000.00" in lines[3]


@pytest.mark.asyncio
async def test_export_csv_uses_correct_days_range():
    repo = AsyncMock()
    repo.find_by_user_between.return_value = []
    uc = ExportCSV(repo)
    await uc.execute("user-1", days=90)
    call_args = repo.find_by_user_between.call_args
    start, end = call_args[0][1], call_args[0][2]
    delta = end - start
    assert 89 <= delta.days <= 91
