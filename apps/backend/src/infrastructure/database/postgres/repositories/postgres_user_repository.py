from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.user import User
from domain.repositories.i_user_repository import IUserRepository
from infrastructure.database.postgres.models.user_model import UserModel


class PostgresUserRepository(IUserRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def find_by_id(self, user_id: str) -> User | None:
        result = await self._session.execute(select(UserModel).where(UserModel.id == user_id))
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(UserModel).where(UserModel.email == email))
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def find_by_google_id(self, google_id: str) -> User | None:
        result = await self._session.execute(select(UserModel).where(UserModel.google_id == google_id))
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def save(self, user: User) -> User:
        model = UserModel(
            id=user.id,
            email=user.email,
            hashed_password=user.hashed_password,
            created_at=user.created_at,
            email_verified=user.email_verified,
            google_id=user.google_id,
        )
        self._session.add(model)
        await self._session.commit()
        return user

    async def find_all(self) -> list[User]:
        result = await self._session.execute(select(UserModel))
        return [self._to_entity(m) for m in result.scalars().all()]

    async def update_password(self, user_id: str, hashed_password: str) -> None:
        result = await self._session.execute(select(UserModel).where(UserModel.id == user_id))
        model = result.scalar_one_or_none()
        if model:
            model.hashed_password = hashed_password
            await self._session.commit()

    async def mark_email_verified(self, user_id: str) -> None:
        result = await self._session.execute(select(UserModel).where(UserModel.id == user_id))
        model = result.scalar_one_or_none()
        if model:
            model.email_verified = True
            await self._session.commit()

    async def update_google(self, user: User) -> None:
        result = await self._session.execute(select(UserModel).where(UserModel.id == user.id))
        model = result.scalar_one_or_none()
        if model:
            model.google_id = user.google_id
            model.email_verified = user.email_verified
            await self._session.commit()

    async def delete(self, user_id: str) -> None:
        result = await self._session.execute(select(UserModel).where(UserModel.id == user_id))
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.commit()

    def _to_entity(self, model: UserModel) -> User:
        return User(
            id=model.id,
            email=model.email,
            hashed_password=model.hashed_password,
            created_at=model.created_at,
            email_verified=getattr(model, "email_verified", False),
            google_id=getattr(model, "google_id", None),
        )
