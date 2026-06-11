import asyncio
import logging
from datetime import datetime, timedelta, timezone

from application.dtos.portfolio.provider_performance_dto import (
    ProviderPerformanceItemDTO,
    ProviderPerformancePointDTO,
    ProviderPerformanceResponseDTO,
)
from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio
from domain.entities.provider_snapshot import ProviderSnapshot
from domain.repositories.i_provider_snapshot_repository import IProviderSnapshotRepository

logger = logging.getLogger(__name__)

_LABELS: dict[str, str] = {
    "binance": "Binance",
    "mercadopago": "MercadoPago",
    "bullmarket": "BullMarket",
    "lemoncash": "Lemon Cash",
    "iol": "InvertirOnline",
    "onchain": "Wallet EVM",
    "solana": "Wallet Solana",
    "balanz_csv": "Balanz",
    "manual": "Manual",
}


class GetProviderPerformance:
    def __init__(
        self,
        portfolio_use_case: GetAggregatedPortfolio,
        provider_snapshot_repo: IProviderSnapshotRepository,
    ) -> None:
        self._portfolio = portfolio_use_case
        self._repo = provider_snapshot_repo

    async def execute(self, user_id: str, days: int = 30) -> ProviderPerformanceResponseDTO:
        now = datetime.now(timezone.utc)
        since = now - timedelta(days=days)

        summary, all_snapshots = await asyncio.gather(
            self._portfolio.execute(user_id),
            self._repo.find_by_user_since(user_id, since),
        )

        items: list[ProviderPerformanceItemDTO] = []
        for p in summary.providers:
            pname = p.provider
            snaps = [s for s in all_snapshots if s.provider == pname]
            snaps_by_day = _dedupe_by_day(snaps)

            history = [
                ProviderPerformancePointDTO(
                    date=s.snapshot_at.strftime("%Y-%m-%d"),
                    balance_usd=round(s.balance_usd, 2),
                )
                for s in snaps_by_day
            ]

            current = p.balance_usd
            items.append(
                ProviderPerformanceItemDTO(
                    provider=pname,
                    label=_LABELS.get(pname, pname),
                    current_usd=current,
                    change_pct_24h=_nearest_change(snaps, current, now - timedelta(hours=23)),
                    change_pct_7d=_nearest_change(snaps, current, now - timedelta(days=6)),
                    change_pct_30d=_nearest_change(snaps, current, now - timedelta(days=29)),
                    history=history,
                )
            )

        return ProviderPerformanceResponseDTO(providers=items)


def _dedupe_by_day(snaps: list[ProviderSnapshot]) -> list[ProviderSnapshot]:
    """Keep one snapshot per calendar day (the last one)."""
    seen: dict[str, ProviderSnapshot] = {}
    for s in snaps:
        day = s.snapshot_at.strftime("%Y-%m-%d")
        seen[day] = s
    return sorted(seen.values(), key=lambda s: s.snapshot_at)


def _nearest_change(
    snaps: list[ProviderSnapshot], current: float, before: datetime
) -> float | None:
    candidates = [s for s in snaps if s.snapshot_at <= before]
    if not candidates:
        return None
    ref = max(candidates, key=lambda s: s.snapshot_at).balance_usd
    if ref == 0:
        return None
    return round((current - ref) / ref * 100, 2)
