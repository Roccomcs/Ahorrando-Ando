import pytest
from unittest.mock import AsyncMock

from application.dtos.auth.login_dto import LoginDTO, TokenDTO
from application.use_cases.auth.login_user import LoginUser
from domain.entities.user import User


def _make_user(email: str = "user@test.com") -> User:
    from datetime import datetime
    return User(id="abc", email=email, hashed_password="hashed", created_at=datetime.utcnow())


def _verify_ok(plain: str, hashed: str) -> bool:
    return True


def _verify_fail(plain: str, hashed: str) -> bool:
    return False


def _token_fn(payload: dict) -> tuple[str, str]:
    return ("access_tok", "refresh_tok")


@pytest.mark.asyncio
async def test_login_returns_token():
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user()

    use_case = LoginUser(user_repo=repo)
    dto = LoginDTO(email="user@test.com", password="pass")

    result = await use_case.execute(dto, _verify_ok, _token_fn)

    assert isinstance(result, TokenDTO)
    assert result.access_token == "access_tok"


@pytest.mark.asyncio
async def test_login_wrong_password_raises():
    repo = AsyncMock()
    repo.find_by_email.return_value = _make_user()

    use_case = LoginUser(user_repo=repo)
    dto = LoginDTO(email="user@test.com", password="wrong")

    with pytest.raises(ValueError, match="Credenciales inválidas"):
        await use_case.execute(dto, _verify_fail, _token_fn)


@pytest.mark.asyncio
async def test_login_unknown_email_raises():
    repo = AsyncMock()
    repo.find_by_email.return_value = None

    use_case = LoginUser(user_repo=repo)
    dto = LoginDTO(email="unknown@test.com", password="pass")

    with pytest.raises(ValueError, match="Credenciales inválidas"):
        await use_case.execute(dto, _verify_ok, _token_fn)
