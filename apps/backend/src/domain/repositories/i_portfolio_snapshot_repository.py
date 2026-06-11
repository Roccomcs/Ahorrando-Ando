from abc import ABC, abstractmethod
from datetime import datetime

from domain.entities.portfolio import Portfolio


class IPortfolioSnapshotRepository(ABC):
    @abstractmethod
    async def save(self, portfolio: Portfolio) -> None: ...

    @abstractmethod
    async def find_by_user_between(
        self, user_id: str, start: datetime, end: datetime
    ) -> list[Portfolio]: ...

    @abstractmethod
    async def find_nearest_before(
        self, user_id: str, before: datetime
    ) -> Portfolio | None:
        """Retorna el snapshot más reciente anterior a `before`."""
        ...
