from abc import ABC, abstractmethod
from datetime import datetime

from domain.entities.integration import Integration


class IIntegrationRepository(ABC):
    @abstractmethod
    async def find_by_user(self, user_id: str) -> list[Integration]: ...

    @abstractmethod
    async def find_by_id(self, integration_id: str) -> Integration | None: ...

    @abstractmethod
    async def save(self, integration: Integration) -> Integration: ...

    @abstractmethod
    async def delete(self, integration_id: str) -> None: ...

    @abstractmethod
    async def update_sync_status(
        self, integration_id: str, error: str | None, synced_at: datetime | None
    ) -> None: ...
