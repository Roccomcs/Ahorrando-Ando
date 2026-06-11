from datetime import datetime

from application.dtos.portfolio.portfolio_history_dto import PortfolioHistoryDTO, PortfolioHistoryPointDTO
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository


class GetPortfolioHistory:
    def __init__(self, snapshot_repo: IPortfolioSnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(
        self, user_id: str, start: datetime, end: datetime
    ) -> PortfolioHistoryDTO:
        snapshots = await self._snapshot_repo.find_by_user_between(user_id, start, end)

        points = [
            PortfolioHistoryPointDTO(
                snapshot_at=s.snapshot_at,
                total_usd=s.total_value.amount,
            )
            for s in snapshots
        ]

        # Downsample to max 200 points so the chart stays responsive
        if len(points) > 200:
            step = len(points) // 200
            points = points[::step]

        change_pct_24h = None
        change_pct_30d = None

        if len(points) >= 2:
            first = points[0].total_usd
            last = points[-1].total_usd
            if first > 0:
                change_pct_24h = round((last - first) / first * 100, 2)

        # 30d: comparar primer punto del rango con el último
        if len(points) >= 2:
            span_days = (points[-1].snapshot_at - points[0].snapshot_at).days
            if span_days >= 25 and points[0].total_usd > 0:
                change_pct_30d = round(
                    (points[-1].total_usd - points[0].total_usd) / points[0].total_usd * 100, 2
                )

        return PortfolioHistoryDTO(
            points=points,
            change_pct_24h=change_pct_24h,
            change_pct_30d=change_pct_30d,
        )
