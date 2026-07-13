import logging
from datetime import datetime, timedelta

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.portfolio.portfolio_history_dto import PortfolioHistoryDTO
from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.dtos.portfolio.provider_performance_dto import ProviderPerformanceResponseDTO
from application.use_cases.analytics.export_csv import ExportCSV
from application.use_cases.analytics.get_allocation import GetAllocation
from application.use_cases.analytics.get_benchmark import GetBenchmark
from application.use_cases.analytics.get_roi import GetROI
from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio
from application.use_cases.portfolio.get_portfolio_history import GetPortfolioHistory
from application.use_cases.portfolio.get_provider_performance import GetProviderPerformance
from application.use_cases.portfolio.refresh_portfolio_data import RefreshPortfolioData
from infrastructure.cache.redis_cache_service import RedisCacheService
from infrastructure.database.postgres.repositories.postgres_integration_repository import PostgresIntegrationRepository
from infrastructure.database.postgres.repositories.postgres_portfolio_snapshot_repository import PostgresPortfolioSnapshotRepository
from infrastructure.database.postgres.repositories.postgres_provider_snapshot_repository import PostgresProviderSnapshotRepository
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from infrastructure.prices.exchange_rate_service import ExchangeRateService
from infrastructure.providers.registry import ProviderRegistry
from interfaces.http.dependencies.get_db_session import get_db_session

logger = logging.getLogger(__name__)

# Clave de caché Redis para el tipo de cambio USD → ARS y TTL de 10 minutos
_USD_ARS_CACHE_KEY = "fx:usd_to_ars"
_USD_ARS_TTL = 600


# Controlador del dashboard. Orquesta todos los use cases relacionados con el portfolio del usuario:
# portfolio agregado, historial, allocación, ROI, benchmark, performance por proveedor y exportación CSV.
class DashboardController:
    # FastAPI inyecta la sesión de BD. El controller crea el caché Redis y los repositorios de snapshots.
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._session = session
        self._cache = RedisCacheService()
        self._snapshot_repo = PostgresPortfolioSnapshotRepository(session)
        self._provider_snapshot_repo = PostgresProviderSnapshotRepository(session)

    # Cotización USD → ARS cacheada en Redis 10 minutos para no hacer fetch en cada request
    async def _usd_to_ars(self) -> float | None:
        cached = await self._cache.get(_USD_ARS_CACHE_KEY)
        if cached:
            return cached
        try:
            rate = await ExchangeRateService().get_usd_to_ars()
        except Exception as exc:
            logger.warning("No se pudo obtener cotización ARS: %s", exc)
            return None
        if rate > 0:
            await self._cache.set(_USD_ARS_CACHE_KEY, rate, ttl=_USD_ARS_TTL)
            return rate
        return None

    # Construye el use case de portfolio con todas sus dependencias (repo, caché, proveedores)
    def _get_portfolio_use_case(self) -> GetAggregatedPortfolio:
        return GetAggregatedPortfolio(
            integration_repo=PostgresIntegrationRepository(self._session),
            snapshot_repo=self._snapshot_repo,
            encryption_service=FernetEncryptionService(),
            cache_service=self._cache,
            provider_registry=ProviderRegistry(),
            provider_snapshot_repo=self._provider_snapshot_repo,
        )

    # Portfolio agregado del usuario + cotización ARS adjunta
    async def get_aggregated(self, user_id: str) -> PortfolioSummaryDTO:
        summary = await self._get_portfolio_use_case().execute(user_id)
        summary.usd_to_ars = await self._usd_to_ars()
        return summary

    # Historial de snapshots del portfolio entre dos fechas + cotización ARS
    async def get_history(
        self, user_id: str, start: datetime, end: datetime
    ) -> PortfolioHistoryDTO:
        use_case = GetPortfolioHistory(self._snapshot_repo)
        history = await use_case.execute(user_id, start, end)
        history.usd_to_ars = await self._usd_to_ars()
        return history

    # Invalida el caché del portfolio y fuerza recarga desde todos los proveedores
    async def refresh(self, user_id: str) -> PortfolioSummaryDTO:
        await RefreshPortfolioData(self._cache).execute(user_id)
        summary = await self._get_portfolio_use_case().execute(user_id)
        summary.usd_to_ars = await self._usd_to_ars()
        return summary

    # Distribución del portfolio por categoría (cripto, acciones, efectivo, etc.)
    async def get_allocation(self, user_id: str) -> dict:
        return await GetAllocation(self._get_portfolio_use_case()).execute(user_id)

    # Retorno sobre la inversión comparado contra snapshots históricos
    async def get_roi(self, user_id: str) -> list[dict]:
        return await GetROI(self._get_portfolio_use_case(), self._snapshot_repo).execute(user_id)

    # Comparación del portfolio del usuario contra BTC o ETH en un período dado
    async def get_benchmark(self, user_id: str, asset: str, period: str) -> dict:
        return await GetBenchmark(self._snapshot_repo).execute(user_id, asset, period)

    # Exporta el historial del portfolio a formato CSV
    async def export_csv(self, user_id: str, days: int) -> str:
        return await ExportCSV(self._snapshot_repo).execute(user_id, days)

    # Rendimiento histórico desglosado por proveedor (Binance, IOL, etc.)
    async def get_provider_performance(
        self, user_id: str, days: int
    ) -> ProviderPerformanceResponseDTO:
        use_case = GetProviderPerformance(
            portfolio_use_case=self._get_portfolio_use_case(),
            provider_snapshot_repo=self._provider_snapshot_repo,
        )
        return await use_case.execute(user_id, days)
