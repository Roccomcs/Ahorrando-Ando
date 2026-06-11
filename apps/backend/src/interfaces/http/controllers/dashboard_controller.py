from datetime import datetime, timedelta

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from application.dtos.portfolio.portfolio_history_dto import PortfolioHistoryDTO
from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio
from application.use_cases.portfolio.get_portfolio_history import GetPortfolioHistory
from application.use_cases.portfolio.refresh_portfolio_data import RefreshPortfolioData
from infrastructure.cache.redis_cache_service import RedisCacheService
from infrastructure.database.postgres.repositories.postgres_integration_repository import PostgresIntegrationRepository
from infrastructure.database.postgres.repositories.postgres_portfolio_snapshot_repository import PostgresPortfolioSnapshotRepository
from infrastructure.encryption.fernet_encryption_service import FernetEncryptionService
from infrastructure.providers.registry import ProviderRegistry
from interfaces.http.dependencies.get_db_session import get_db_session


class DashboardController:
    def __init__(self, session: AsyncSession = Depends(get_db_session)) -> None:
        self._session = session
        self._cache = RedisCacheService()
        self._snapshot_repo = PostgresPortfolioSnapshotRepository(session)

    def _get_portfolio_use_case(self) -> GetAggregatedPortfolio:
        return GetAggregatedPortfolio(
            integration_repo=PostgresIntegrationRepository(self._session),
            snapshot_repo=self._snapshot_repo,
            encryption_service=FernetEncryptionService(),
            cache_service=self._cache,
            provider_registry=ProviderRegistry(),
        )

    async def get_aggregated(self, user_id: str) -> PortfolioSummaryDTO:
        return await self._get_portfolio_use_case().execute(user_id)

    async def get_history(
        self, user_id: str, start: datetime, end: datetime
    ) -> PortfolioHistoryDTO:
        use_case = GetPortfolioHistory(self._snapshot_repo)
        return await use_case.execute(user_id, start, end)

    async def refresh(self, user_id: str) -> PortfolioSummaryDTO:
        await RefreshPortfolioData(self._cache).execute(user_id)
        return await self._get_portfolio_use_case().execute(user_id)
