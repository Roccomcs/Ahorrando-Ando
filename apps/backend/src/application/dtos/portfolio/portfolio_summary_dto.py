from pydantic import BaseModel


class HoldingDTO(BaseModel):
    asset_name: str
    asset_symbol: str
    amount: float
    current_value_usd: float
    performance_24h: float
    performance_30d: float


class ProviderSummaryDTO(BaseModel):
    provider: str
    balance_usd: float
    holdings: list[HoldingDTO]
    performance: dict[str, float]


class PortfolioSummaryDTO(BaseModel):
    total_usd: float
    usd_to_ars: float | None = None
    change_pct_24h: float | None = None
    change_pct_30d: float | None = None
    providers: list[ProviderSummaryDTO]

    @classmethod
    def aggregate(cls, results: list[dict]) -> "PortfolioSummaryDTO":
        providers = []
        total = 0.0
        for r in results:
            balance = r["balance"].amount
            total += balance
            holdings = [
                HoldingDTO(
                    asset_name=h.asset_name,
                    asset_symbol=h.asset_symbol,
                    amount=h.amount,
                    current_value_usd=h.current_value.amount,
                    performance_24h=h.performance_24h.value,
                    performance_30d=h.performance_30d.value,
                )
                for h in r["holdings"]
            ]
            providers.append(
                ProviderSummaryDTO(
                    provider=r["provider"],
                    balance_usd=balance,
                    holdings=holdings,
                    performance=r["performance"],
                )
            )
        return cls(total_usd=total, providers=providers)
