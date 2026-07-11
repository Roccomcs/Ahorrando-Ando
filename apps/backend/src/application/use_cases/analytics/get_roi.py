from datetime import datetime, timedelta, timezone

from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository


class GetROI:
    """
    Calcula ROI por holding comparando el valor actual contra el snapshot más antiguo
    disponible (proxy del precio de entrada).
    """

    def __init__(
        self,
        portfolio_use_case: GetAggregatedPortfolio,
        snapshot_repo: IPortfolioSnapshotRepository,
    ) -> None:
        self._portfolio = portfolio_use_case
        self._snapshot_repo = snapshot_repo

    async def execute(self, user_id: str) -> list[dict]:
        summary = await self._portfolio.execute(user_id)

        now = datetime.now(timezone.utc).replace(tzinfo=None)
        oldest_snapshot = await self._snapshot_repo.find_nearest_before(
            user_id, now - timedelta(days=89)
        )

        results = []
        for provider in summary.providers:
            for h in provider.holdings:
                roi_pct = None
                # Use 30d performance as ROI proxy when no old snapshot available
                if h.performance_30d is not None:
                    roi_pct = h.performance_30d

                results.append({
                    "asset_symbol": h.asset_symbol,
                    "asset_name": h.asset_name,
                    "provider": provider.provider,
                    "amount": h.amount,
                    "current_value_usd": round(h.current_value_usd, 2),
                    "performance_24h": h.performance_24h,
                    "performance_30d": h.performance_30d,
                    "roi_pct": round(roi_pct, 2) if roi_pct is not None else None,
                    "category": getattr(h, "category", None),
                    "logo_url": getattr(h, "logo_url", None),
                })

        return sorted(results, key=lambda x: x["current_value_usd"], reverse=True)
