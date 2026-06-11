from datetime import datetime, timedelta, timezone

from domain.repositories.i_portfolio_snapshot_repository import IPortfolioSnapshotRepository
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}

BENCHMARK_ASSETS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SP500": None,  # Sin API gratuita de S&P 500, omitimos
}


class GetBenchmark:
    def __init__(self, snapshot_repo: IPortfolioSnapshotRepository) -> None:
        self._snapshot_repo = snapshot_repo
        self._price_svc = CoinGeckoPriceService()

    async def execute(self, user_id: str, asset: str, period: str) -> dict:
        days = PERIOD_DAYS.get(period, 30)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        since = now - timedelta(days=days)

        snapshots = await self._snapshot_repo.find_by_user_between(user_id, since, now)

        portfolio_change_pct: float | None = None
        if len(snapshots) >= 2:
            first_val = snapshots[0].total_value.amount
            last_val = snapshots[-1].total_value.amount
            if first_val > 0:
                portfolio_change_pct = round((last_val - first_val) / first_val * 100, 2)

        asset_upper = asset.upper()
        cg_id = BENCHMARK_ASSETS.get(asset_upper)
        asset_change_pct: float | None = None

        if cg_id:
            try:
                prices = await self._price_svc.get_prices_usd([cg_id])
                current_price = prices.get(cg_id)

                # Approximate past price using CoinGecko market_chart
                from infrastructure.providers._base.http_client import BaseHttpClient
                client = BaseHttpClient("https://api.coingecko.com/api/v3")
                data = await client.get(f"/coins/{cg_id}/market_chart?vs_currency=usd&days={days}")
                prices_list = data.get("prices", [])
                if prices_list and current_price:
                    past_price = prices_list[0][1]
                    if past_price > 0:
                        asset_change_pct = round((current_price - past_price) / past_price * 100, 2)
            except Exception:
                pass

        return {
            "period": period,
            "benchmark_asset": asset_upper,
            "portfolio_change_pct": portfolio_change_pct,
            "asset_change_pct": asset_change_pct,
            "outperformed": (
                portfolio_change_pct is not None
                and asset_change_pct is not None
                and portfolio_change_pct > asset_change_pct
            ),
            "snapshot_count": len(snapshots),
        }
