import logging
from datetime import datetime, timedelta, timezone

from application.ports.i_notification_service import INotificationService
from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository
from domain.repositories.i_user_repository import IUserRepository

logger = logging.getLogger(__name__)


class SendWeeklySummary:
    def __init__(
        self,
        user_repo: IUserRepository,
        snapshot_repo: IPortfolioSnapshotRepository,
        notification_svc: INotificationService,
    ) -> None:
        self._user_repo = user_repo
        self._snapshot_repo = snapshot_repo
        self._notification_svc = notification_svc

    async def execute(self) -> int:
        users = await self._user_repo.find_all()
        sent = 0
        now = datetime.now(timezone.utc)
        week_ago = now - timedelta(days=7)

        for user in users:
            try:
                snapshots = await self._snapshot_repo.find_by_user_since(user.id, week_ago)
                if not snapshots:
                    continue

                latest = max(snapshots, key=lambda s: s.snapshot_at)
                oldest = min(snapshots, key=lambda s: s.snapshot_at)
                total_usd = latest.total_usd
                change_pct = (
                    ((latest.total_usd - oldest.total_usd) / oldest.total_usd * 100)
                    if oldest.total_usd > 0
                    else None
                )

                top_assets: list[dict] = []
                if latest.holdings:
                    sorted_h = sorted(latest.holdings, key=lambda h: h.get("current_value_usd", 0), reverse=True)
                    top_assets = sorted_h[:3]

                await self._notification_svc.send_weekly_summary(
                    user_email=user.email,
                    total_usd=total_usd,
                    change_pct_7d=change_pct,
                    top_assets=top_assets,
                )
                sent += 1
            except Exception:
                logger.exception("Error enviando resumen semanal a %s", user.email)

        return sent
