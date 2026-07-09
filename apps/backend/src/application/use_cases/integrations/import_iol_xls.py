import json
import uuid

from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.ports.i_encryption_service import IEncryptionService
from domain.entities.integration import Integration
from domain.repositories.i_integration_repository import IIntegrationRepository
from domain.value_objects.provider_type import ProviderType
from infrastructure.prices.exchange_rate_service import ExchangeRateService
from infrastructure.providers.iol.iol_operations_parser import parse_operations


class ImportIOLXls:
    """Importa la cartera actual desde el export 'Operaciones Finalizadas' de IOL.

    El export es historial de operaciones; se deriva la tenencia neta por símbolo.
    Los holdings se guardan con el shape manual (category+ref) para poder cotizar
    en vivo con data912; el precio de la última operación (ARS→USD) queda como
    fallback.
    """

    def __init__(
        self,
        integration_repo: IIntegrationRepository,
        encryption_service: IEncryptionService,
        exchange_rate_service: ExchangeRateService | None = None,
    ) -> None:
        self._repo = integration_repo
        self._encryption = encryption_service
        self._fx = exchange_rate_service or ExchangeRateService()

    async def execute(self, user_id: str, file_bytes: bytes) -> IntegrationSummaryDTO:
        positions = parse_operations(file_bytes)
        if not positions:
            raise ValueError("El archivo no contiene tenencias netas (compras − ventas).")

        try:
            ars_to_usd = await self._fx.get_ars_to_usd()
        except Exception:
            ars_to_usd = 0.0

        def _price_usd(p) -> float:
            # US$ → el precio ya está en dólares; AR$ → convertir con el blue.
            if p.currency == "USD":
                return round(p.price, 6)
            return round(p.price * ars_to_usd, 6) if ars_to_usd else 0.0

        holdings = [
            {
                "symbol": p.symbol,
                "name": p.name,
                "amount": p.amount,
                "category": p.category,
                "ref": p.ref,
                "price_usd": _price_usd(p),
                "logo_url": None,
            }
            for p in positions
        ]
        credentials = {"institution_name": "Invertir Online", "holdings": holdings}

        encrypted = self._encryption.encrypt(json.dumps(credentials))
        integration = Integration(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=ProviderType.IOL_CSV,
            encrypted_credentials=encrypted,
        )
        saved = await self._repo.save(integration)
        return IntegrationSummaryDTO(
            id=saved.id,
            provider_type=saved.type,
            is_active=saved.is_active,
        )
