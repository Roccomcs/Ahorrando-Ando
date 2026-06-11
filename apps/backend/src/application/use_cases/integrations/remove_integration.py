from domain.repositories.i_integration_repository import IIntegrationRepository


class RemoveIntegration:
    def __init__(self, integration_repo: IIntegrationRepository) -> None:
        self._repo = integration_repo

    async def execute(self, user_id: str, integration_id: str) -> None:
        integration = await self._repo.find_by_id(integration_id)
        if not integration or integration.user_id != user_id:
            raise ValueError("Integración no encontrada")
        await self._repo.delete(integration_id)
