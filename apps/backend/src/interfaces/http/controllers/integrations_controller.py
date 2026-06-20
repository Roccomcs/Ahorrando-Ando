from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.use_cases.integrations.add_integration import AddIntegration
from application.use_cases.integrations.import_balanz_csv import ImportBalanzCSV
from application.use_cases.integrations.import_bullmarket_csv import ImportBullMarketCSV
from application.use_cases.integrations.list_user_integrations import ListUserIntegrations
from application.use_cases.integrations.remove_integration import RemoveIntegration
from infrastructure.cache.redis_cache_service import RedisCacheService
from infrastructure.database.postgres.repositories.postgres_integration_repository import PostgresIntegrationRepository
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from infrastructure.providers.registry import ProviderRegistry
from interfaces.http.dependencies.get_db_session import get_db_session


class IntegrationsController:
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._repo = PostgresIntegrationRepository(session)
        self._encryption = FernetEncryptionService()
        self._registry = ProviderRegistry()
        self._cache = RedisCacheService()

    async def list_integrations(self, user_id: str) -> list[IntegrationSummaryDTO]:
        return await ListUserIntegrations(self._repo).execute(user_id)

    async def add_integration(self, user_id: str, dto: AddIntegrationDTO) -> IntegrationSummaryDTO:
        return await AddIntegration(self._repo, self._encryption, self._registry).execute(user_id, dto)

    async def remove_integration(self, user_id: str, integration_id: str) -> None:
        await RemoveIntegration(self._repo).execute(user_id, integration_id)

    async def import_balanz_csv(self, user_id: str, csv_bytes: bytes) -> IntegrationSummaryDTO:
        return await ImportBalanzCSV(self._repo, self._encryption).execute(user_id, csv_bytes)

    async def import_bullmarket_csv(self, user_id: str, csv_bytes: bytes) -> IntegrationSummaryDTO:
        return await ImportBullMarketCSV(self._repo, self._encryption).execute(user_id, csv_bytes)

    async def sync_integration(self, user_id: str, integration_id: str) -> dict:
        integration = await self._repo.find_by_id(integration_id)
        if not integration or integration.user_id != user_id:
            raise ValueError("Integración no encontrada")
        await self._cache.delete(f"portfolio:{user_id}")
        return {"synced": True, "integration_id": integration_id}
