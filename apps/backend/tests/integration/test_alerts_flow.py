"""
Test de integración: flujo de alertas con DB real.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from interfaces.http.app import create_app


@pytest.fixture
async def authed_client():
    """Cliente con usuario ya logueado."""
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        await c.post("/api/v1/auth/register", json={
            "email": "alerts_int@test.com", "password": "pass1234"
        })
        r = await c.post("/api/v1/auth/login", json={
            "email": "alerts_int@test.com", "password": "pass1234"
        })
        token = r.json()["access_token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


@pytest.mark.asyncio
async def test_create_and_list_alert(authed_client):
    r = await authed_client.post("/api/v1/alerts", json={
        "asset_symbol": "BTC",
        "threshold_usd": 80000.0,
        "direction": "above",
    })
    assert r.status_code == 201
    alert_id = r.json()["id"]

    r = await authed_client.get("/api/v1/alerts")
    assert r.status_code == 200
    ids = [a["id"] for a in r.json()]
    assert alert_id in ids


@pytest.mark.asyncio
async def test_delete_alert(authed_client):
    r = await authed_client.post("/api/v1/alerts", json={
        "asset_symbol": "ETH",
        "threshold_usd": 2000.0,
        "direction": "below",
    })
    alert_id = r.json()["id"]

    r = await authed_client.delete(f"/api/v1/alerts/{alert_id}")
    assert r.status_code == 200

    r = await authed_client.get("/api/v1/alerts")
    active_ids = [a["id"] for a in r.json() if a["is_active"]]
    assert alert_id not in active_ids


@pytest.mark.asyncio
async def test_create_alert_invalid_threshold_returns_422(authed_client):
    r = await authed_client.post("/api/v1/alerts", json={
        "asset_symbol": "BTC",
        "threshold_usd": -100.0,
        "direction": "above",
    })
    assert r.status_code == 422
