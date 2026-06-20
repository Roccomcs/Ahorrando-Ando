import pytest
from unittest.mock import AsyncMock

from application.dtos.auth.register_dto import RegisterDTO
from application.use_cases.auth.register_user import RegisterUser
from domain.entities.user import User

_VALID_PASSWORD = "SecurePass123"


def _make_user(email: str = "test@test.com") -> User:
    from datetime import datetime, timezone
    return User(id="abc", email=email, hashed_password="hashed", created_at=datetime.now(timezone.utc))


@pytest.mark.asyncio
async def test_register_new_user():
    repo = AsyncMock()
    repo.find_by_email.return_value = None
    repo.save.return_value = _make_user()

    use_case = RegisterUser(user_repo=repo)
    dto = RegisterDTO(email="test@test.com", password=_VALID_PASSWORD)

    user = await use_case.execute(dto, hashed_password="hashed")

    repo.save.assert_called_once()
    assert user.email == "test@test.com"


@pytest.mark.asyncio
async def test_register_duplicate_email_raises():
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user()

    use_case = RegisterUser(user_repo=repo)
    dto = RegisterDTO(email="test@test.com", password=_VALID_PASSWORD)

    with pytest.raises(ValueError, match="No se pudo crear la cuenta"):
        await use_case.execute(dto, hashed_password="hashed")

    repo.save.assert_not_called()
