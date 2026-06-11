from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from infrastructure.providers.registry import ProviderRegistry


class ValidateIntegrationCredentials:
    def __init__(self, provider_registry: ProviderRegistry) -> None:
        self._registry = provider_registry

    async def execute(self, dto: AddIntegrationDTO) -> bool:
        provider = self._registry.get(dto.provider_type, dto.credentials)
        return await provider.authenticate()
