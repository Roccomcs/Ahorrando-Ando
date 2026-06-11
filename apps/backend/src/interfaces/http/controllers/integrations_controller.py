from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.use_cases.integrations.add_integration import AddIntegration
from application.use_cases.integrations.list_user_integrations import ListUserIntegrations
from application.use_cases.integrations.remove_integration import RemoveIntegration
from infrastructure.database.postgres.repositories.postgres_integration_repository import PostgresIntegrationRepository
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from infrastructure.providers.registry import ProviderRegistry
from interfaces.http.dependencies.get_db_session import get_db_session


class IntegrationsController:
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._repo = PostgresIntegrationRepository(session)
        self._encryption = FernetEncryptionService()
        self._registry = ProviderRegistry()

    async def list_integrations(self, user_id: str) -> list[IntegrationSummaryDTO]:
        return await ListUserIntegrations(self._repo).execute(user_id)

    async def add_integration(self, user_id: str, dto: AddIntegrationDTO) -> IntegrationSummaryDTO:
        return await AddIntegration(self._repo, self._encryption, self._registry).execute(user_id, dto)

    async def remove_integration(self, user_id: str, integration_id: str) -> None:
        await RemoveIntegration(self._repo).execute(user_id, integration_id)
