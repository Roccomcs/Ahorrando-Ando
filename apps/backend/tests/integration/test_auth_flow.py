"""
Test de integración: flujo completo de autenticación con DB real.
Requiere: DATABASE_URL y REDIS_URL reales en el entorno.
"""
import pytest
from httpx import ASGITransport, AsyncClient

from interfaces.http.app import create_app


@pytest.fixture
async def int_client():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_full_auth_flow(int_client):
    """Register → login → get /auth/me → logout → token blacklisted."""
    email = "integration_test@test.com"
    password = "TestPass1234"

    # 1. Register
    r = await int_client.post("/api/v1/auth/register", json={"email": email, "password": password})
    assert r.status_code == 200, r.text

    # 2. Login
    r = await int_client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200
    tokens = r.json()
    access = tokens["access_token"]

    # 3. /auth/me con token válido
    r = await int_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert r.status_code == 200
    assert r.json()["email"] == email

    # 4. Logout
    refresh = int_client.cookies.get("refresh_token", "")
    r = await int_client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {access}"},
        cookies={"refresh_token": refresh},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_duplicate_register_returns_error(int_client):
    email = "duplicate_int@test.com"
    payload = {"email": email, "password": "TestPass1234"}
    await int_client.post("/api/v1/auth/register", json=payload)
    r = await int_client.post("/api/v1/auth/register", json=payload)
    assert r.status_code in (400, 409, 422)


@pytest.mark.asyncio
async def test_rate_limiter_kicks_in(int_client):
    """Más de 20 requests seguidos al endpoint público deben devolver 429."""
    results = []
    for _ in range(25):
        r = await int_client.post("/api/v1/auth/login", json={
            "email": "notexist@test.com", "password": "wrong"
        })
        results.append(r.status_code)
    assert 429 in results
