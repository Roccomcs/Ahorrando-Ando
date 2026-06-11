import csv
import io
from datetime import datetime, timedelta, timezone

from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository


class ExportCSV:
    def __init__(self, snapshot_repo: IPortfolioSnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo

    async def execute(self, user_id: str, days: int = 365) -> str:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        since = now - timedelta(days=days)
        snapshots = await self._snapshot_repo.find_by_user_between(user_id, since, now)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["fecha", "total_usd"])
        for s in snapshots:
            writer.writerow([
                s.snapshot_at.strftime("%Y-%m-%d %H:%M"),
                f"{s.total_value.amount:.2f}",
            ])
        return output.getvalue()
