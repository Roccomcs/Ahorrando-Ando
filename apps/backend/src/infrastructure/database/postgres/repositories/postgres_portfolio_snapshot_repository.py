import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.portfolio import Portfolio
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository
from domain.value_objects.money import Currency, Money
from infrastructure.database.postgres.models.portfolio_snapshot_model import PortfolioSnapshotModel


# Implementación PostgreSQL del repositorio de snapshots del portfolio.
# Un snapshot guarda el valor total del portfolio en un momento dado (para armar el gráfico histórico).
class PostgresPortfolioSnapshotRepository(IPortfolioSnapshotRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Guarda un snapshot del valor total del portfolio del usuario en la fecha actual
    async def save(self, portfolio: Portfolio) -> None:
        model = PortfolioSnapshotModel(
            id=str(uuid.uuid4()),
            user_id=portfolio.user_id,
            total_usd=portfolio.total_value.amount,
            snapshot_at=portfolio.snapshot_at,
        )
        self._session.add(model)
        await self._session.commit()

    # Snapshots del portfolio entre dos fechas (para el gráfico de historial)
    async def find_by_user_between(
        self, user_id: str, start: datetime, end: datetime
    ) -> list[Portfolio]:
        result = await self._session.execute(
            select(PortfolioSnapshotModel)
            .where(PortfolioSnapshotModel.user_id == user_id)
            .where(PortfolioSnapshotModel.snapshot_at.between(start, end))
            .order_by(PortfolioSnapshotModel.snapshot_at)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    # Snapshots del portfolio desde una fecha hasta ahora (para ROI y benchmark)
    async def find_by_user_since(self, user_id: str, since: datetime) -> list[Portfolio]:
        result = await self._session.execute(
            select(PortfolioSnapshotModel)
            .where(PortfolioSnapshotModel.user_id == user_id)
            .where(PortfolioSnapshotModel.snapshot_at >= since)
            .order_by(PortfolioSnapshotModel.snapshot_at)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    # Snapshot más cercano ANTES de una fecha dada (para calcular variación puntual, ej. hace 30 días)
    async def find_nearest_before(self, user_id: str, before: datetime) -> Portfolio | None:
        result = await self._session.execute(
            select(PortfolioSnapshotModel)
            .where(PortfolioSnapshotModel.user_id == user_id)
            .where(PortfolioSnapshotModel.snapshot_at < before)
            .order_by(PortfolioSnapshotModel.snapshot_at.desc())
            .limit(1)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    # Convierte el modelo SQLAlchemy (PortfolioSnapshotModel) a la entidad del dominio (Portfolio)
    def _to_entity(self, model: PortfolioSnapshotModel) -> Portfolio:
        return Portfolio(
            user_id=model.user_id,
            total_value=Money(amount=model.total_usd, currency=Currency.USD),
            holdings=[],
            snapshot_at=model.snapshot_at,
        )
