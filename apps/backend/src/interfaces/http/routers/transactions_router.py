from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from application.use_cases.transactions.list_transactions import ListTransactions
from domain.entities.transaction import Transaction
from domain.entities.user import User
from infrastructure.database.postgres.connection import get_session
from infrastructure.database.postgres.repositories.postgres_transaction_repository import (
    PostgresTransactionRepository,
)
from interfaces.http.dependencies.get_current_user import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionResponse(BaseModel):
    id: str
    tx_type: str
    amount_usd: float
    account: str
    asset_symbol: str | None
    quantity: float | None
    price_usd: float | None
    note: str | None
    occurred_at: str


def _to_response(t: Transaction) -> TransactionResponse:
    return TransactionResponse(
        id=t.id,
        tx_type=t.tx_type.value,
        amount_usd=t.amount_usd,
        account=t.account,
        asset_symbol=t.asset_symbol,
        quantity=t.quantity,
        price_usd=t.price_usd,
        note=t.note,
        occurred_at=t.occurred_at.isoformat(),
    )


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    days: int = Query(default=30, ge=1, le=730),
    tx_type: str | None = Query(default=None, pattern="^(buy|sell|deposit|withdrawal|yield)$"),
    account: str | None = Query(default=None, max_length=80),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[TransactionResponse]:
    from_date = datetime.now(timezone.utc) - timedelta(days=days)
    txs = await ListTransactions(PostgresTransactionRepository(session)).execute(
        current_user.id, from_date=from_date, tx_type=tx_type, account=account
    )
    return [_to_response(t) for t in txs]
