from abc import ABC, abstractmethod
from datetime import datetime

from domain.entities.transaction import Transaction


class ITransactionRepository(ABC):
    @abstractmethod
    async def save_many(self, transactions: list[Transaction]) -> None: ...

    @abstractmethod
    async def find_by_user(
        self,
        user_id: str,
        from_date: datetime | None = None,
        tx_type: str | None = None,
        account: str | None = None,
        limit: int = 500,
    ) -> list[Transaction]: ...
