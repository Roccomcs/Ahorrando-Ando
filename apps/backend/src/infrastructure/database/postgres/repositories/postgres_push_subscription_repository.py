from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.push_subscription import PushSubscription
from domain.repositories.i_push_subscription_repository import IPushSubscriptionRepository
from infrastructure.database.postgres.models.push_subscription_model import PushSubscriptionModel


# Implementación PostgreSQL del repositorio de suscripciones push.
# Guarda los endpoints del navegador para enviar notificaciones web push (alertas de precio).
class PostgresPushSubscriptionRepository(IPushSubscriptionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Registra una suscripción push nueva; si el endpoint ya existe, no duplica
    async def save(self, sub: PushSubscription) -> PushSubscription:
        existing = await self._session.execute(
            select(PushSubscriptionModel).where(PushSubscriptionModel.endpoint == sub.endpoint)
        )
        if existing.scalar_one_or_none():
            return sub

        model = PushSubscriptionModel(
            id=sub.id,
            user_id=sub.user_id,
            endpoint=sub.endpoint,
            p256dh=sub.p256dh,
            auth=sub.auth,
            created_at=sub.created_at,
        )
        self._session.add(model)
        await self._session.commit()
        return sub

    # Lista todos los dispositivos/navegadores suscritos del usuario (para enviarles la notificación)
    async def find_by_user(self, user_id: str) -> list[PushSubscription]:
        stmt = select(PushSubscriptionModel).where(PushSubscriptionModel.user_id == user_id)
        result = await self._session.execute(stmt)
        return [_to_entity(r) for r in result.scalars().all()]

    # Elimina una suscripción por endpoint (cuando el usuario desactiva las notificaciones)
    async def delete(self, endpoint: str, user_id: str) -> None:
        stmt = select(PushSubscriptionModel).where(
            PushSubscriptionModel.endpoint == endpoint,
            PushSubscriptionModel.user_id == user_id,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.commit()


# Convierte el modelo SQLAlchemy (PushSubscriptionModel) a la entidad del dominio (PushSubscription)
def _to_entity(m: PushSubscriptionModel) -> PushSubscription:
    return PushSubscription(
        id=m.id,
        user_id=m.user_id,
        endpoint=m.endpoint,
        p256dh=m.p256dh,
        auth=m.auth,
        created_at=m.created_at,
    )
