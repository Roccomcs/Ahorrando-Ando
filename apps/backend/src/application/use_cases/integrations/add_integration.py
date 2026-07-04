import json
import uuid

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.ports.i_encryption_service import IEncryptionService
from domain.entities.integration import Integration
from domain.repositories.i_integration_repository import IIntegrationRepository
from infrastructure.providers._base.errors import ProviderAuthError
from infrastructure.providers.registry import ProviderRegistry


class AddIntegration:
    def __init__(
        self,
        integration_repo: IIntegrationRepository,
        encryption_service: IEncryptionService,
        provider_registry: ProviderRegistry,
    ) -> None:
        self._repo = integration_repo
        self._encryption = encryption_service
        self._registry = provider_registry

    async def execute(self, user_id: str, dto: AddIntegrationDTO) -> IntegrationSummaryDTO:
        provider = self._registry.get(dto.provider_type, dto.credentials)
        try:
            valid = await provider.authenticate()
        except ProviderAuthError as e:
            # El provider ya devolvió un mensaje claro para el usuario.
            raise ValueError(str(e)) from e
        except Exception as e:
            raise ValueError(f"No se pudo verificar las credenciales: {e}") from e
        if not valid:
            raise ValueError("Las credenciales no son válidas. Verificá tu API key o usuario/contraseña.")

        encrypted = self._encryption.encrypt(json.dumps(dto.credentials))
        integration = Integration(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=dto.provider_type,
            encrypted_credentials=encrypted,
        )
        saved = await self._repo.save(integration)
        return IntegrationSummaryDTO(
            id=saved.id,
            provider_type=saved.type,
            is_active=saved.is_active,
        )
