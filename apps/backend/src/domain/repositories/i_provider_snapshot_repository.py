from abc import ABC, abstractmethod
from datetime import datetime

from domain.entities.provider_snapshot import ProviderSnapshot


class IProviderSnapshotRepository(ABC):
    @abstractmethod
    async def save_many(self, snapshots: list[ProviderSnapshot]) -> None: ...

    @abstractmethod
    async def find_by_user_since(
        self, user_id: str, since: datetime
    ) -> list[ProviderSnapshot]: ...

    @abstractmethod
    async def find_nearest_before(
        self, user_id: str, provider: str, before: datetime
    ) -> ProviderSnapshot | None: ...
