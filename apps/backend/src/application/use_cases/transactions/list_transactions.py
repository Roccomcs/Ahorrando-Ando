from datetime import datetime

from domain.entities.transaction import Transaction
from domain.repositories.i_transaction_repository import ITransactionRepository


class ListTransactions:
    def __init__(self, repo: ITransactionRepository) -> None:
        self._repo = repo

    async def execute(
        self,
        user_id: str,
        from_date: datetime | None = None,
        tx_type: str | None = None,
        account: str | None = None,
    ) -> list[Transaction]:
        return await self._repo.find_by_user(
            user_id, from_date=from_date, tx_type=tx_type, account=account
        )
