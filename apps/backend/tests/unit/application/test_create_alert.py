import pytest
from unittest.mock import AsyncMock

from application.use_cases.alerts.create_alert import CreateAlert, CreateAlertDTO
from domain.entities.price_alert import AlertDirection, PriceAlert


def _make_repo(saved: PriceAlert | None = None) -> AsyncMock:
    repo = AsyncMock()
    repo.save.side_effect = lambda a: a  # devuelve la misma entidad
    return repo


@pytest.mark.asyncio
async def test_create_alert_above():
    repo = _make_repo()
    uc = CreateAlert(repo)
    alert = await uc.execute(CreateAlertDTO(
        user_id="u1",
        asset_symbol="btc",
        threshold_usd=80_000.0,
        direction="above",
    ))
    assert alert.asset_symbol == "BTC"  # normalizado a mayúsculas
    assert alert.direction == AlertDirection.ABOVE
    assert alert.threshold_usd == 80_000.0
    assert alert.is_active is True
    repo.save.assert_called_once()


@pytest.mark.asyncio
async def test_create_alert_below():
    repo = _make_repo()
    uc = CreateAlert(repo)
    alert = await uc.execute(CreateAlertDTO(
        user_id="u1",
        asset_symbol="ETH",
        threshold_usd=2_000.0,
        direction="below",
        note="soporte clave",
    ))
    assert alert.direction == AlertDirection.BELOW
    assert alert.note == "soporte clave"


@pytest.mark.asyncio
async def test_create_alert_zero_threshold_raises():
    repo = _make_repo()
    uc = CreateAlert(repo)
    with pytest.raises(ValueError, match="mayor a cero"):
        await uc.execute(CreateAlertDTO(
            user_id="u1", asset_symbol="BTC", threshold_usd=0.0, direction="above"
        ))
    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_create_alert_negative_threshold_raises():
    repo = _make_repo()
    uc = CreateAlert(repo)
    with pytest.raises(ValueError, match="mayor a cero"):
        await uc.execute(CreateAlertDTO(
            user_id="u1", asset_symbol="BTC", threshold_usd=-100.0, direction="above"
        ))


@pytest.mark.asyncio
async def test_create_alert_invalid_direction_raises():
    repo = _make_repo()
    uc = CreateAlert(repo)
    with pytest.raises(ValueError, match="direction"):
        await uc.execute(CreateAlertDTO(
            user_id="u1", asset_symbol="BTC", threshold_usd=50_000.0, direction="sideways"
        ))
