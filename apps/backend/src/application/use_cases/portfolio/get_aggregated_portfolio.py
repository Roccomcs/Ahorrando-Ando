import asyncio
import logging
from datetime import datetime, timedelta

from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.ports.i_cache_service import ICacheService
from application.ports.i_encryption_service import IEncryptionService
from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.portfolio import Portfolio
from domain.repositories.i_integration_repository import IIntegrationRepository
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository
from domain.value_objects.money import Currency, Money
from infrastructure.providers.registry import ProviderRegistry

logger = logging.getLogger(__name__)


class GetAggregatedPortfolio:
    def __init__(
        self,
        integration_repo: IIntegrationRepository,
        snapshot_repo: IPortfolioSnapshotRepository,
        encryption_service: IEncryptionService,
        cache_service: ICacheService,
        provider_registry: ProviderRegistry,
    ) -> None:
        self._integration_repo = integration_repo
        self._snapshot_repo = snapshot_repo
        self._encryption = encryption_service
        self._cache = cache_service
        self._registry = provider_registry

    async def execute(self, user_id: str) -> PortfolioSummaryDTO:
        cached = await self._cache.get(f"portfolio:{user_id}")
        if cached:
            return PortfolioSummaryDTO.model_validate(cached)

        integrations = await self._integration_repo.find_by_user(user_id)

        if not integrations:
            summary = PortfolioSummaryDTO(total_usd=0.0, providers=[])
        else:
            results = await asyncio.gather(
                *[self._fetch_from_provider(i) for i in integrations],
                return_exceptions=True,
            )
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.warning("Provider %s falló: %s", integrations[i].type, result)
            valid_results = [r for r in results if not isinstance(r, Exception)]
            summary = PortfolioSummaryDTO.aggregate(valid_results)

        # Calcular performance comparando con snapshots anteriores
        now = datetime.utcnow()
        snap_24h, snap_30d = await asyncio.gather(
            self._snapshot_repo.find_nearest_before(user_id, now - timedelta(hours=23)),
            self._snapshot_repo.find_nearest_before(user_id, now - timedelta(days=29)),
        )

        if snap_24h and snap_24h.total_value.amount > 0:
            summary.change_pct_24h = _pct_change(snap_24h.total_value.amount, summary.total_usd)
        if snap_30d and snap_30d.total_value.amount > 0:
            summary.change_pct_30d = _pct_change(snap_30d.total_value.amount, summary.total_usd)

        # Guardar snapshot del estado actual
        await self._save_snapshot(user_id, summary.total_usd, now)

        await self._cache.set(f"portfolio:{user_id}", summary.model_dump(), ttl=300)
        return summary

    async def _fetch_from_provider(self, integration) -> dict:
        credentials = self._encryption.decrypt(integration.encrypted_credentials)
        provider: IFinancialProvider = self._registry.get(integration.type, credentials)

        holdings, performance = await asyncio.gather(
            provider.get_holdings(),
            provider.get_performance(),
        )

        total_usd = sum(h.current_value.amount for h in holdings)
        balance = Money(amount=total_usd, currency=Currency.USD)

        return {
            "provider": provider.name,
            "balance": balance,
            "holdings": holdings,
            "performance": performance,
        }

    async def _save_snapshot(self, user_id: str, total_usd: float, now: datetime) -> None:
        try:
            portfolio = Portfolio(
                user_id=user_id,
                total_value=Money(amount=total_usd, currency=Currency.USD),
                holdings=[],
                snapshot_at=now,
            )
            await self._snapshot_repo.save(portfolio)
        except Exception as e:
            logger.warning("No se pudo guardar snapshot: %s", e)


def _pct_change(old: float, new: float) -> float:
    return round((new - old) / old * 100, 2)
