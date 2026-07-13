from sqlalchemy import delete as sql_delete
from sqlalchemy.ext.asyncio import AsyncSession

# Uses AsyncSession directly because it needs atomic cross-table delete
# without introducing a delete_all_by_user method on every repository.


# Caso de uso para eliminar una cuenta de usuario con todos sus datos asociados.
# Usa la sesión de SQLAlchemy directamente para borrar en cascada de forma atómica (una sola transacción).
class DeleteAccount:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Borra en orden correcto para respetar foreign keys: suscripciones → alertas → integraciones → snapshots → audit → usuario
    async def execute(self, user_id: str) -> None:
        from infrastructure.database.postgres.models.audit_log_model import AuditLogModel
        from infrastructure.database.postgres.models.integration_model import IntegrationModel
        from infrastructure.database.postgres.models.portfolio_snapshot_model import PortfolioSnapshotModel
        from infrastructure.database.postgres.models.price_alert_model import PriceAlertModel
        from infrastructure.database.postgres.models.push_subscription_model import PushSubscriptionModel
        from infrastructure.database.postgres.models.user_model import UserModel

        await self._session.execute(sql_delete(PushSubscriptionModel).where(PushSubscriptionModel.user_id == user_id))
        await self._session.execute(sql_delete(PriceAlertModel).where(PriceAlertModel.user_id == user_id))
        await self._session.execute(sql_delete(IntegrationModel).where(IntegrationModel.user_id == user_id))
        await self._session.execute(sql_delete(PortfolioSnapshotModel).where(PortfolioSnapshotModel.user_id == user_id))
        await self._session.execute(sql_delete(AuditLogModel).where(AuditLogModel.user_id == user_id))
        await self._session.execute(sql_delete(UserModel).where(UserModel.id == user_id))
        await self._session.commit()
