from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.integration import Integration
from domain.repositories.i_integration_repository import IIntegrationRepository
from domain.value_objects.provider_type import ProviderType
from infrastructure.database.postgres.models.integration_model import IntegrationModel


# Implementación PostgreSQL del repositorio de integraciones. Traduce entre la entidad Integration del dominio y el modelo SQLAlchemy IntegrationModel.
class PostgresIntegrationRepository(IIntegrationRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # Lista todas las integraciones de un usuario
    async def find_by_user(self, user_id: str) -> list[Integration]:
        result = await self._session.execute(
            select(IntegrationModel).where(IntegrationModel.user_id == user_id)
        )
        return [self._to_entity(m) for m in result.scalars().all()]

    # Busca una integración por su id (para verificar pertenencia o actualizar)
    async def find_by_id(self, integration_id: str) -> Integration | None:
        result = await self._session.execute(
            select(IntegrationModel).where(IntegrationModel.id == integration_id)
        )
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    # Inserta una nueva integración en la BD con las credenciales encriptadas
    async def save(self, integration: Integration) -> Integration:
        model = IntegrationModel(
            id=integration.id,
            user_id=integration.user_id,
            type=integration.type.value,
            encrypted_credentials=integration.encrypted_credentials,
            is_active=integration.is_active,
            last_error=integration.last_error,
            last_sync_at=integration.last_sync_at,
        )
        self._session.add(model)
        await self._session.commit()
        return integration

    async def delete(self, integration_id: str) -> None:
        result = await self._session.execute(
            select(IntegrationModel).where(IntegrationModel.id == integration_id)
        )
        model = result.scalar_one_or_none()
        if model:
            await self._session.delete(model)
            await self._session.commit()

    # Actualiza el estado de sincronización: error, fecha y si está activa
    async def update_sync_status(
        self, integration_id: str, error: str | None, synced_at: datetime | None
    ) -> None:
        result = await self._session.execute(
            select(IntegrationModel).where(IntegrationModel.id == integration_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.last_error = error
            model.last_sync_at = synced_at
            model.is_active = error is None
            await self._session.commit()

    # Pisa las credenciales encriptadas y reactiva la integración (limpia el último error)
    async def update_credentials(
        self, integration_id: str, encrypted_credentials: str
    ) -> None:
        result = await self._session.execute(
            select(IntegrationModel).where(IntegrationModel.id == integration_id)
        )
        model = result.scalar_one_or_none()
        if model:
            model.encrypted_credentials = encrypted_credentials
            model.last_error = None
            model.is_active = True
            await self._session.commit()

    # Convierte el modelo SQLAlchemy (IntegrationModel) a la entidad del dominio (Integration)
    def _to_entity(self, model: IntegrationModel) -> Integration:
        return Integration(
            id=model.id,
            user_id=model.user_id,
            type=ProviderType(model.type),
            encrypted_credentials=model.encrypted_credentials,
            is_active=model.is_active,
            last_error=model.last_error,
            last_sync_at=model.last_sync_at,
        )
