from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.price_alert import AlertDirection, PriceAlert
from domain.repositories.i_price_alert_repository import IPriceAlertRepository
from infrastructure.database.postgres.models.price_alert_model import PriceAlertModel


# Implementación PostgreSQL del repositorio de alertas de precio. CRUD completo + activar/desactivar.
class PostgresPriceAlertRepository(IPriceAlertRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Inserta una nueva alerta en la BD
    async def save(self, alert: PriceAlert) -> PriceAlert:
        model = PriceAlertModel(
            id=alert.id,
            user_id=alert.user_id,
            asset_symbol=alert.asset_symbol,
            threshold_usd=alert.threshold_usd,
            direction=alert.direction.value,
            is_active=alert.is_active,
            note=alert.note,
            created_at=alert.created_at,
            triggered_at=alert.triggered_at,
        )
        self._session.add(model)
        await self._session.commit()
        return alert

    # Lista todas las alertas del usuario ordenadas por fecha de creación (más recientes primero)
    async def find_by_user(self, user_id: str) -> list[PriceAlert]:
        stmt = (
            select(PriceAlertModel)
            .where(PriceAlertModel.user_id == user_id)
            .order_by(PriceAlertModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return [_to_entity(r) for r in result.scalars().all()]

    # Lista todas las alertas activas de todos los usuarios (usado por el scheduler cada 5 min)
    async def find_active(self, limit: int = 2000) -> list[PriceAlert]:
        stmt = select(PriceAlertModel).where(PriceAlertModel.is_active.is_(True)).limit(limit)
        result = await self._session.execute(stmt)
        return [_to_entity(r) for r in result.scalars().all()]

    # Marca una alerta como disparada: la desactiva y registra la fecha en triggered_at
    async def mark_triggered(self, alert_id: str) -> None:
        await self._session.execute(
            update(PriceAlertModel)
            .where(PriceAlertModel.id == alert_id)
            .values(is_active=False, triggered_at=datetime.now(timezone.utc))
        )
        await self._session.commit()

    async def set_active(self, alert_id: str, user_id: str, active: bool) -> None:
        # Al reactivar, limpiamos triggered_at para que pueda volver a dispararse.
        values = {"is_active": True, "triggered_at": None} if active else {"is_active": False}
        await self._session.execute(
            update(PriceAlertModel)
            .where(PriceAlertModel.id == alert_id, PriceAlertModel.user_id == user_id)
            .values(**values)
        )
        await self._session.commit()

    async def delete(self, alert_id: str, user_id: str) -> None:
        stmt = select(PriceAlertModel).where(
            PriceAlertModel.id == alert_id,
            PriceAlertModel.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.commit()


# Convierte el modelo SQLAlchemy (PriceAlertModel) a la entidad del dominio (PriceAlert)
def _to_entity(m: PriceAlertModel) -> PriceAlert:
    return PriceAlert(
        id=m.id,
        user_id=m.user_id,
        asset_symbol=m.asset_symbol,
        threshold_usd=m.threshold_usd,
        direction=AlertDirection(m.direction),
        is_active=m.is_active,
        note=m.note,
        created_at=m.created_at,
        triggered_at=m.triggered_at,
    )
