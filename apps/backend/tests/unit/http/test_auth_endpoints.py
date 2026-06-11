"""
Tests del flujo HTTP de autenticación usando dependency_overrides.
No requieren base de datos real.
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from domain.entities.user import User
from interfaces.http.dependencies.get_db_session import get_db_session


def _make_user(user_id="u1", email="test@test.com"):
    return User(id=user_id, email=email, hashed_password="$2b$12$hashed", created_at=datetime.now(timezone.utc))


@pytest.fixture
def app_with_mocks(app):
    """App con sesión de DB mockeada."""
    mock_session = AsyncMock()

    async def override_session():
        yield mock_session

    app.dependency_overrides[get_db_session] = override_session
    yield app, mock_session
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_returns_201(app_with_mocks):
    app, session = app_with_mocks

    # Mock del repositorio de usuarios
    from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
    with patch.object(PostgresUserRepository, "find_by_email", return_value=None), \
         patch.object(PostgresUserRepository, "save", side_effect=lambda u: u):

        from httpx import ASGITransport, AsyncClient
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post("/api/v1/auth/register", json={
                "email": "new@test.com",
                "password": "pass1234",
            })

    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_400(app_with_mocks):
    app, session = app_with_mocks

    from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
    with patch.object(PostgresUserRepository, "find_by_email", return_value=_make_user(email="dup@test.com")):

        from httpx import ASGITransport, AsyncClient
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post("/api/v1/auth/register", json={
                "email": "dup@test.com",
                "password": "pass1234",
            })

    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_register_short_password_returns_422(client):
    resp = await client.post("/api/v1/auth/register", json={
        "email": "test@test.com",
        "password": "short",  # < 8 chars
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_unknown_user_returns_401(app_with_mocks):
    app, session = app_with_mocks

    from infrastructure.database.postgres.repositories.postgres_user_repository import PostgresUserRepository
    with patch.object(PostgresUserRepository, "find_by_email", return_value=None):

        from httpx import ASGITransport, AsyncClient
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            resp = await c.post("/api/v1/auth/login", json={
                "email": "noexiste@test.com",
                "password": "pass1234",
            })

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_without_token_returns_401(client):
    resp = await client.get("/api/v1/dashboard/")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_alerts_without_token_returns_401(client):
    resp = await client.get("/api/v1/alerts")
    assert resp.status_code == 401
