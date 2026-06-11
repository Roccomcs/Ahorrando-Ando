import json
import uuid

from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.ports.i_encryption_service import IEncryptionService
from domain.entities.integration import Integration
from domain.repositories.i_integration_repository import IIntegrationRepository
from domain.value_objects.provider_type import ProviderType
from infrastructure.providers.balanz.balanz_csv_parser import parse_csv


class ImportBalanzCSV:
    def __init__(
        self,
        integration_repo: IIntegrationRepository,
        encryption_service: IEncryptionService,
    ) -> None:
        self._repo = integration_repo
        self._encryption = encryption_service

    async def execute(self, user_id: str, csv_bytes: bytes) -> IntegrationSummaryDTO:
        positions = parse_csv(csv_bytes)
        if not positions:
            raise ValueError("El CSV no contiene posiciones válidas.")

        credentials = {
            "positions": [
                {
                    "symbol": p.symbol,
                    "name": p.name,
                    "amount": p.amount,
                    "price_usd": p.price_usd,
                }
                for p in positions
            ]
        }

        encrypted = self._encryption.encrypt(json.dumps(credentials))
        integration = Integration(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=ProviderType.BALANZ_CSV,
            encrypted_credentials=encrypted,
        )
        saved = await self._repo.save(integration)
        return IntegrationSummaryDTO(
            id=saved.id,
            provider_type=saved.type,
            is_active=saved.is_active,
        )
