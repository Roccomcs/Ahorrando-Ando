import asyncio
import logging
from datetime import datetime, timedelta, timezone

from application.dtos.portfolio.portfolio_summary_dto import PortfolioSummaryDTO
from application.ports.i_cache_service import ICacheService
from application.ports.i_encryption_service import IEncryptionService
from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.portfolio import Portfolio
from domain.entities.provider_snapshot import ProviderSnapshot
from domain.repositories.i_integration_repository import IIntegrationRepository
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository
from domain.repositories.i_provider_snapshot_repository import IProviderSnapshotRepository
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
        provider_snapshot_repo: IProviderSnapshotRepository | None = None,
    ) -> None:
        self._integration_repo = integration_repo
        self._snapshot_repo = snapshot_repo
        self._encryption = encryption_service
        self._cache = cache_service
        self._registry = provider_registry
        self._provider_snapshot_repo = provider_snapshot_repo

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
            sync_now = datetime.now(timezone.utc)
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    from infrastructure.providers._base.circuit_breaker import CircuitBreakerOpen
                    if isinstance(result, CircuitBreakerOpen):
                        logger.warning("Provider %s omitido (circuit breaker abierto)", integrations[i].type)
                    else:
                        logger.warning("Provider %s falló: %s", integrations[i].type, result)
                    await self._integration_repo.update_sync_status(
                        integrations[i].id, str(result)[:500], None
                    )
                else:
                    await self._integration_repo.update_sync_status(
                        integrations[i].id, None, sync_now
                    )
            valid_results = [r for r in results if not isinstance(r, Exception)]
            summary = PortfolioSummaryDTO.aggregate(valid_results)

        # Calcular performance comparando con snapshots anteriores
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        snap_24h, snap_30d = await asyncio.gather(
            self._snapshot_repo.find_nearest_before(user_id, now - timedelta(hours=23)),
            self._snapshot_repo.find_nearest_before(user_id, now - timedelta(days=29)),
        )

        if snap_24h and snap_24h.total_value.amount > 0:
            summary.change_pct_24h = _pct_change(snap_24h.total_value.amount, summary.total_usd)
        if snap_30d and snap_30d.total_value.amount > 0:
            summary.change_pct_30d = _pct_change(snap_30d.total_value.amount, summary.total_usd)

        # Completar logos faltantes de los holdings (cripto/acciones/CEDEARs).
        await self._enrich_logos(summary)

        # Guardar snapshots del estado actual (total + por provider)
        await self._save_snapshot(user_id, summary.total_usd, now)
        await self._save_provider_snapshots(user_id, summary, now)

        await self._cache.set(f"portfolio:{user_id}", summary.model_dump(), ttl=300)
        return summary

    async def _enrich_logos(self, summary) -> None:
        try:
            from infrastructure.prices.logo_service import fill_holding_logos
            all_holdings = [h for p in summary.providers for h in p.holdings]
            await fill_holding_logos(all_holdings)
        except Exception as e:
            logger.warning("No se pudieron completar logos: %s", e)

    async def _fetch_from_provider(self, integration) -> dict:
        from infrastructure.providers._base.circuit_breaker import CircuitBreaker, CircuitBreakerOpen

        credentials = self._encryption.decrypt(integration.encrypted_credentials)
        provider: IFinancialProvider = self._registry.get(integration.type, credentials)

        try:
            import sentry_sdk
            sentry_sdk.set_tag("provider", str(integration.type))
        except ImportError:
            pass

        cb = CircuitBreaker(integration.type)
        async with cb:
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


    async def _save_provider_snapshots(
        self, user_id: str, summary, now: datetime
    ) -> None:
        if not self._provider_snapshot_repo or not summary.providers:
            return
        try:
            snaps = [
                ProviderSnapshot(
                    id="",
                    user_id=user_id,
                    provider=p.provider,
                    balance_usd=p.balance_usd,
                    snapshot_at=now,
                )
                for p in summary.providers
            ]
            await self._provider_snapshot_repo.save_many(snaps)
        except Exception as e:
            logger.warning("No se pudo guardar provider snapshots: %s", e)


def _pct_change(old: float, new: float) -> float:
    return round((new - old) / old * 100, 2)
