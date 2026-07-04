import pytest
from unittest.mock import AsyncMock

from application.dtos.auth.register_dto import RegisterDTO
from application.use_cases.auth.register_user import RegisterUser
from domain.entities.user import User

_VALID_PASSWORD = "SecurePass123"


def _make_user(email: str = "test@test.com", verified: bool = False, password: str | None = "hashed") -> User:
    from datetime import datetime, timezone
    return User(
        id="abc",
        email=email,
        hashed_password=password,
        created_at=datetime.now(timezone.utc),
        email_verified=verified,
    )


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
async def test_register_duplicate_verified_email_raises():
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user(verified=True)

    use_case = RegisterUser(user_repo=repo)
    dto = RegisterDTO(email="test@test.com", password=_VALID_PASSWORD)

    with pytest.raises(ValueError, match="ya está registrado"):
        await use_case.execute(dto, hashed_password="hashed")

    repo.save.assert_not_called()


@pytest.mark.asyncio
async def test_register_unverified_email_allows_retry():
    """Una cuenta sin verificar no queda trabada: reintentar el registro
    actualiza la contraseña y dispara un nuevo código de verificación."""
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user(verified=False)

    use_case = RegisterUser(user_repo=repo)
    dto = RegisterDTO(email="test@test.com", password=_VALID_PASSWORD)

    user = await use_case.execute(dto, hashed_password="nuevo-hash")

    repo.update_password.assert_called_once_with("abc", "nuevo-hash")
    repo.save.assert_not_called()
    assert user.email_verified is False
    assert user.hashed_password == "nuevo-hash"


@pytest.mark.asyncio
async def test_register_google_only_unverified_raises():
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user(verified=False, password=None)

    use_case = RegisterUser(user_repo=repo)
    dto = RegisterDTO(email="test@test.com", password=_VALID_PASSWORD)

    with pytest.raises(ValueError, match="Google"):
        await use_case.execute(dto, hashed_password="hashed")

    repo.save.assert_not_called()
