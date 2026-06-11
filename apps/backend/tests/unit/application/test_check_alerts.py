import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from application.use_cases.alerts.check_alerts import CheckAlerts
from domain.entities.price_alert import AlertDirection, PriceAlert
from domain.entities.push_subscription import PushSubscription
from domain.entities.user import User


def _make_alert(
    symbol: str = "BTC",
    threshold: float = 80_000.0,
    direction: AlertDirection = AlertDirection.ABOVE,
) -> PriceAlert:
    return PriceAlert(
        id="alert-1",
        user_id="user-1",
        asset_symbol=symbol,
        threshold_usd=threshold,
        direction=direction,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )


def _make_user() -> User:
    return User(id="user-1", email="test@test.com", hashed_password="h", created_at=datetime.now(timezone.utc))


def _make_use_case(alerts, user, prices, subs=None):
    alert_repo = AsyncMock()
    alert_repo.find_active.return_value = alerts
    alert_repo.mark_triggered.return_value = None

    user_repo = AsyncMock()
    user_repo.find_by_id.return_value = user

    push_repo = AsyncMock()
    push_repo.find_by_user.return_value = subs or []

    notification_svc = AsyncMock()
    push_svc = AsyncMock()

    uc = CheckAlerts(
        alert_repo=alert_repo,
        user_repo=user_repo,
        push_sub_repo=push_repo,
        notification_service=notification_svc,
        push_service=push_svc,
    )
    # Parchamos el price service para evitar llamadas HTTP
    uc._price_svc = AsyncMock()
    uc._price_svc.get_prices_usd.return_value = prices
    return uc, alert_repo, notification_svc, push_svc


@pytest.mark.asyncio
async def test_no_active_alerts_returns_zero():
    uc, _, _, _ = _make_use_case([], _make_user(), {})
    count = await uc.execute()
    assert count == 0


@pytest.mark.asyncio
async def test_alert_above_triggered_when_price_exceeds():
    alert = _make_alert("BTC", 80_000.0, AlertDirection.ABOVE)
    uc, alert_repo, notif, _ = _make_use_case(
        [alert], _make_user(), {"bitcoin": 85_000.0}
    )
    count = await uc.execute()
    assert count == 1
    alert_repo.mark_triggered.assert_called_once_with("alert-1")
    notif.send_alert_triggered.assert_called_once()


@pytest.mark.asyncio
async def test_alert_above_not_triggered_when_price_below():
    alert = _make_alert("BTC", 80_000.0, AlertDirection.ABOVE)
    uc, alert_repo, notif, _ = _make_use_case(
        [alert], _make_user(), {"bitcoin": 75_000.0}
    )
    count = await uc.execute()
    assert count == 0
    alert_repo.mark_triggered.assert_not_called()


@pytest.mark.asyncio
async def test_alert_below_triggered_when_price_drops():
    alert = _make_alert("ETH", 2_000.0, AlertDirection.BELOW)
    uc, alert_repo, notif, _ = _make_use_case(
        [alert], _make_user(), {"ethereum": 1_800.0}
    )
    count = await uc.execute()
    assert count == 1
    alert_repo.mark_triggered.assert_called_once_with("alert-1")


@pytest.mark.asyncio
async def test_push_sent_when_subscription_exists():
    alert = _make_alert("BTC", 80_000.0, AlertDirection.ABOVE)
    sub = PushSubscription(
        id="sub-1", user_id="user-1", endpoint="https://push.example",
        p256dh="key", auth="auth", created_at=datetime.now(timezone.utc)
    )
    uc, _, _, push_svc = _make_use_case(
        [alert], _make_user(), {"bitcoin": 90_000.0}, subs=[sub]
    )
    await uc.execute()
    push_svc.send.assert_called_once()


@pytest.mark.asyncio
async def test_unknown_symbol_skipped():
    alert = _make_alert("UNKNOWNCOIN", 100.0, AlertDirection.ABOVE)
    uc, alert_repo, _, _ = _make_use_case(
        [alert], _make_user(), {}
    )
    count = await uc.execute()
    assert count == 0
    alert_repo.mark_triggered.assert_not_called()
