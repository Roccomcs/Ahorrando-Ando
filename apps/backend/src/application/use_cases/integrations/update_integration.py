import json

from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.dtos.integration.update_integration_dto import UpdateIntegrationDTO
from application.ports.i_encryption_service import IEncryptionService
from domain.repositories.i_integration_repository import IIntegrationRepository


class UpdateIntegration:
    """Actualiza in-place las credenciales de una integración manual (editar posiciones
    sin borrar y recrear). Solo permitido para provider_type == 'manual'."""

    def __init__(
        self,
        integration_repo: IIntegrationRepository,
        encryption_service: IEncryptionService,
    ) -> None:
        self._repo = integration_repo
        self._encryption = encryption_service

    async def execute(
        self, user_id: str, integration_id: str, dto: UpdateIntegrationDTO
    ) -> IntegrationSummaryDTO:
        integration = await self._repo.find_by_id(integration_id)
        if not integration or integration.user_id != user_id:
            raise ValueError("Integración no encontrada")
        if integration.type.value != "manual":
            raise ValueError("Solo se pueden editar integraciones manuales.")

        encrypted = self._encryption.encrypt(json.dumps(dto.credentials))
        await self._repo.update_credentials(integration_id, encrypted)

        return IntegrationSummaryDTO(
            id=integration.id,
            provider_type=integration.type,
            is_active=True,
        )
