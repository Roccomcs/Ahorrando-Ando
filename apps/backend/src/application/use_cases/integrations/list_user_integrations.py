from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from domain.repositories.i_integration_repository import IIntegrationRepository


class ListUserIntegrations:
    def __init__(self, integration_repo: IIntegrationRepository) -> None:
        self._repo = integration_repo

    async def execute(self, user_id: str) -> list[IntegrationSummaryDTO]:
        integrations = await self._repo.find_by_user(user_id)
        return [
            IntegrationSummaryDTO(id=i.id, provider_type=i.type, is_active=i.is_active)
            for i in integrations
        ]
