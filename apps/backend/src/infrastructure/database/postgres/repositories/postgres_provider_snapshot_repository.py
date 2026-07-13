import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.provider_snapshot import ProviderSnapshot
from domain.repositories.i_provider_snapshot_repository import IProviderSnapshotRepository
from infrastructure.database.postgres.models.provider_snapshot_model import ProviderSnapshotModel


# Implementación PostgreSQL del repositorio de snapshots por proveedor.
# Guarda el balance de cada integración (Binance, IOL, manual...) en el tiempo para graficar por cuenta.
class PostgresProviderSnapshotRepository(IProviderSnapshotRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Inserta múltiples snapshots en una sola transacción (uno por cada proveedor activo)
    async def save_many(self, snapshots: list[ProviderSnapshot]) -> None:
        for snap in snapshots:
            model = ProviderSnapshotModel(
                id=str(uuid.uuid4()),
                user_id=snap.user_id,
                provider=snap.provider,
                balance_usd=snap.balance_usd,
                snapshot_at=snap.snapshot_at,
            )
            self._session.add(model)
        await self._session.commit()

    # Snapshots de todos los proveedores del usuario desde una fecha hasta ahora
    async def find_by_user_since(
        self, user_id: str, since: datetime
    ) -> list[ProviderSnapshot]:
        result = await self._session.execute(
            select(ProviderSnapshotModel)
            .where(ProviderSnapshotModel.user_id == user_id)
            .where(ProviderSnapshotModel.snapshot_at >= since)
            .order_by(ProviderSnapshotModel.provider, ProviderSnapshotModel.snapshot_at)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    # Snapshot más cercano ANTES de una fecha para un proveedor puntual (para calcular delta)
    async def find_nearest_before(
        self, user_id: str, provider: str, before: datetime
    ) -> ProviderSnapshot | None:
        result = await self._session.execute(
            select(ProviderSnapshotModel)
            .where(ProviderSnapshotModel.user_id == user_id)
            .where(ProviderSnapshotModel.provider == provider)
            .where(ProviderSnapshotModel.snapshot_at < before)
            .order_by(ProviderSnapshotModel.snapshot_at.desc())
            .limit(1)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    # Convierte el modelo SQLAlchemy (ProviderSnapshotModel) a la entidad del dominio (ProviderSnapshot)
    def _to_entity(self, model: ProviderSnapshotModel) -> ProviderSnapshot:
        return ProviderSnapshot(
            id=model.id,
            user_id=model.user_id,
            provider=model.provider,
            balance_usd=model.balance_usd,
            snapshot_at=model.snapshot_at,
        )
