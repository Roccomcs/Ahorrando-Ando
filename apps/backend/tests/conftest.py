import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, MagicMock

from interfaces.http.app import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------------------
# Helpers compartidos entre tests de integración HTTP
# ---------------------------------------------------------------------------

def make_mock_user(user_id: str = "user-1", email: str = "test@test.com"):
    from datetime import datetime, timezone
    from domain.entities.user import User
    return User(id=user_id, email=email, hashed_password="hashed", created_at=datetime.now(timezone.utc))


def make_mock_session():
    """Sesión de SQLAlchemy completamente mockeada."""
    session = AsyncMock()
    return session
