from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.transaction import Transaction, TransactionType
from domain.repositories.i_transaction_repository import ITransactionRepository
from infrastructure.database.postgres.models.transaction_model import TransactionModel


# Implementación PostgreSQL del repositorio de transacciones. Registra movimientos financieros reales del usuario.
class PostgresTransactionRepository(ITransactionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Inserta múltiples transacciones en una sola operación (usado al sincronizar posiciones manuales)
    async def save_many(self, transactions: list[Transaction]) -> None:
        if not transactions:
            return
        for t in transactions:
            self._session.add(TransactionModel(
                id=t.id,
                user_id=t.user_id,
                tx_type=t.tx_type.value,
                amount_usd=t.amount_usd,
                account=t.account,
                asset_symbol=t.asset_symbol,
                quantity=t.quantity,
                price_usd=t.price_usd,
                integration_id=t.integration_id,
                note=t.note,
                occurred_at=t.occurred_at,
                created_at=t.created_at,
            ))
        await self._session.commit()

    # Lista las transacciones del usuario con filtros opcionales de fecha, tipo y cuenta. Máximo 500 resultados.
    async def find_by_user(
        self,
        user_id: str,
        from_date: datetime | None = None,
        tx_type: str | None = None,
        account: str | None = None,
        limit: int = 500,
    ) -> list[Transaction]:
        stmt = select(TransactionModel).where(TransactionModel.user_id == user_id)
        if from_date is not None:
            stmt = stmt.where(TransactionModel.occurred_at >= from_date)
        if tx_type:
            stmt = stmt.where(TransactionModel.tx_type == tx_type)
        if account:
            stmt = stmt.where(TransactionModel.account == account)
        stmt = stmt.order_by(TransactionModel.occurred_at.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return [_to_entity(m) for m in result.scalars().all()]


# Convierte el modelo SQLAlchemy (TransactionModel) a la entidad del dominio (Transaction)
def _to_entity(m: TransactionModel) -> Transaction:
    return Transaction(
        id=m.id,
        user_id=m.user_id,
        tx_type=TransactionType(m.tx_type),
        amount_usd=m.amount_usd,
        account=m.account,
        asset_symbol=m.asset_symbol,
        quantity=m.quantity,
        price_usd=m.price_usd,
        integration_id=m.integration_id,
        note=m.note,
        occurred_at=m.occurred_at,
        created_at=m.created_at,
    )
