from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.integration.add_integration_dto import AddIntegrationDTO
from application.dtos.integration.integration_summary_dto import IntegrationSummaryDTO
from application.dtos.integration.update_integration_dto import UpdateIntegrationDTO
from application.use_cases.integrations.add_integration import AddIntegration
from application.use_cases.integrations.update_integration import UpdateIntegration
from application.use_cases.integrations.import_iol_xls import ImportIOLXls
from application.use_cases.integrations.list_user_integrations import ListUserIntegrations
from application.use_cases.integrations.remove_integration import RemoveIntegration
from application.use_cases.transactions.record_manual_movements import RecordManualMovements
from infrastructure.cache.redis_cache_service import RedisCacheService
from infrastructure.database.postgres.repositories.postgres_integration_repository import PostgresIntegrationRepository
from infrastructure.database.postgres.repositories.postgres_transaction_repository import PostgresTransactionRepository
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from infrastructure.providers.registry import ProviderRegistry
from interfaces.http.dependencies.get_db_session import get_db_session


class IntegrationsController:
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._repo = PostgresIntegrationRepository(session)
        self._tx_repo = PostgresTransactionRepository(session)
        self._encryption = FernetEncryptionService()
        self._registry = ProviderRegistry()
        self._cache = RedisCacheService()

    async def list_integrations(self, user_id: str) -> list[IntegrationSummaryDTO]:
        return await ListUserIntegrations(self._repo).execute(user_id)

    async def add_integration(self, user_id: str, dto: AddIntegrationDTO) -> IntegrationSummaryDTO:
        result = await AddIntegration(self._repo, self._encryption, self._registry).execute(user_id, dto)
        # Alta manual: la carga inicial de posiciones son movimientos reales
        # (compras/depósitos) para el historial.
        if dto.provider_type.value == "manual":
            holdings = dto.credentials.get("holdings", []) if isinstance(dto.credentials, dict) else []
            account = (dto.credentials or {}).get("institution_name") or "Manual"
            await RecordManualMovements(self._tx_repo).execute(
                user_id, result.id, account, old_holdings=[], new_holdings=holdings
            )
        # El portfolio agregado se cachea 5 min; sin esto, la cuenta recién
        # conectada no aparece en el dashboard hasta que expire el TTL.
        await self._cache.delete(f"portfolio:{user_id}")
        return result

    async def update_integration(
        self, user_id: str, integration_id: str, dto: UpdateIntegrationDTO
    ) -> IntegrationSummaryDTO:
        # Antes de pisar las credenciales, leemos las posiciones actuales para
        # derivar los movimientos (delta de cantidades = compra/venta real).
        old_holdings: list = []
        account = "Manual"
        integration = await self._repo.find_by_id(integration_id)
        if integration and integration.user_id == user_id and integration.type.value == "manual":
            old_creds = self._encryption.decrypt(integration.encrypted_credentials)
            old_holdings = old_creds.get("holdings", [])
            account = old_creds.get("institution_name") or account

        result = await UpdateIntegration(self._repo, self._encryption).execute(
            user_id, integration_id, dto
        )

        new_holdings = dto.credentials.get("holdings", []) if isinstance(dto.credentials, dict) else []
        account = (dto.credentials or {}).get("institution_name") or account
        await RecordManualMovements(self._tx_repo).execute(
            user_id, integration_id, account, old_holdings=old_holdings, new_holdings=new_holdings
        )

        await self._cache.delete(f"portfolio:{user_id}")
        return result

    async def get_manual_holdings(self, user_id: str, integration_id: str) -> dict:
        integration = await self._repo.find_by_id(integration_id)
        if not integration or integration.user_id != user_id:
            raise ValueError("Integración no encontrada")
        if integration.type.value not in ("manual", "iol_csv"):
            raise ValueError("Solo disponible para integraciones manuales.")
        creds = self._encryption.decrypt(integration.encrypted_credentials)
        # Los logos faltantes los resuelve el frontend por símbolo (GET /assets/logo),
        # para no bloquear esta respuesta con llamadas a TradingView/CoinGecko.
        return {
            "institution_name": creds.get("institution_name", ""),
            "holdings": creds.get("holdings", []),
            "editable": integration.type.value == "manual",
        }

    async def remove_integration(self, user_id: str, integration_id: str) -> None:
        await RemoveIntegration(self._repo).execute(user_id, integration_id)
        # Sin esto, la cuenta borrada sigue sumando al total hasta que venza el
        # cache de 5 min del portfolio.
        await self._cache.delete(f"portfolio:{user_id}")

    async def import_iol_xls(self, user_id: str, file_bytes: bytes) -> IntegrationSummaryDTO:
        result = await ImportIOLXls(self._repo, self._encryption).execute(user_id, file_bytes)
        await self._cache.delete(f"portfolio:{user_id}")
        return result

    async def sync_integration(self, user_id: str, integration_id: str) -> dict:
        integration = await self._repo.find_by_id(integration_id)
        if not integration or integration.user_id != user_id:
            raise ValueError("Integración no encontrada")
        await self._cache.delete(f"portfolio:{user_id}")
        return {"synced": True, "integration_id": integration_id}
