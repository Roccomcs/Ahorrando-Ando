import uuid
from datetime import datetime, timezone

from application.dtos.auth.register_dto import RegisterDTO
from domain.entities.user import User
from domain.repositories.i_user_repository import IUserRepository


class RegisterUser:
    def __init__(self, user_repo: IUserRepository) -> None:
        self._repo = user_repo

    async def execute(self, dto: RegisterDTO, hashed_password: str) -> User:
        existing = await self._repo.find_by_email(dto.email)
        if existing:
            raise ValueError("No se pudo crear la cuenta. Verificá los datos ingresados.")

        user = User(
            id=str(uuid.uuid4()),
            email=dto.email,
            hashed_password=hashed_password,
            created_at=datetime.now(timezone.utc),
        )
        return await self._repo.save(user)
