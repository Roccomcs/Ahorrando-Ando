from abc import ABC, abstractmethod

from domain.entities.user import User


class IUserRepository(ABC):
    @abstractmethod
    async def find_by_id(self, user_id: str) -> User | None: ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None: ...

    @abstractmethod
    async def save(self, user: User) -> User: ...

    @abstractmethod
    async def delete(self, user_id: str) -> None: ...

    @abstractmethod
    async def find_all(self) -> list[User]: ...

    @abstractmethod
    async def update_password(self, user_id: str, hashed_password: str) -> None: ...
