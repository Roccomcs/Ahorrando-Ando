from dataclasses import dataclass

from application.use_cases.portfolio.get_aggregated_portfolio import GetAggregatedPortfolio


@dataclass
class AllocationItem:
    label: str
    usd_value: float
    percentage: float
    category: str  # "asset" | "provider" | "type"


class GetAllocation:
    def __init__(self, portfolio_use_case: GetAggregatedPortfolio) -> None:
        self._portfolio = portfolio_use_case

    async def execute(self, user_id: str) -> dict:
        summary = await self._portfolio.execute(user_id)
        total = summary.total_usd
        if total == 0:
            return {"by_asset": [], "by_provider": [], "by_type": []}

        # Aggregate holdings across all providers
        asset_totals: dict[str, float] = {}
        provider_totals: dict[str, float] = {}
        type_totals: dict[str, float] = {"crypto": 0.0, "fiat": 0.0, "stocks": 0.0, "other": 0.0}

        FIAT_SYMBOLS = {"ARS", "USD", "USDT", "USDC", "DAI", "BUSD"}
        STOCK_PROVIDERS = {"bullmarket", "iol"}

        for provider in summary.providers:
            provider_totals[provider.provider] = provider_totals.get(provider.provider, 0) + provider.balance_usd
            for h in provider.holdings:
                sym = h.asset_symbol.upper()
                asset_totals[sym] = asset_totals.get(sym, 0) + h.current_value_usd
                if provider.provider in STOCK_PROVIDERS:
                    type_totals["stocks"] += h.current_value_usd
                elif sym in FIAT_SYMBOLS:
                    type_totals["fiat"] += h.current_value_usd
                else:
                    type_totals["crypto"] += h.current_value_usd

        def to_items(d: dict[str, float], category: str) -> list[dict]:
            items = [
                {"label": k, "usd_value": round(v, 2), "percentage": round(v / total * 100, 2), "category": category}
                for k, v in sorted(d.items(), key=lambda x: x[1], reverse=True)
                if v > 0
            ]
            return items

        return {
            "total_usd": round(total, 2),
            "by_asset": to_items(asset_totals, "asset"),
            "by_provider": to_items(provider_totals, "provider"),
            "by_type": to_items({k: v for k, v in type_totals.items() if v > 0}, "type"),
        }
