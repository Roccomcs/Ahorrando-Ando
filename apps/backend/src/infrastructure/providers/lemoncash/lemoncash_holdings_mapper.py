from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class LemonCashHoldingsMapper:
    def map(self, assets: list[dict]) -> list[Holding]:
        holdings = []
        for asset in assets:
            amount = float(asset.get("amount", 0))
            if amount <= 0:
                continue

            symbol = asset.get("ticker", "").upper()
            name = asset.get("name", symbol)
            price_usd = float(asset.get("price_usd", 0))
            value_usd = amount * price_usd

            # Lemon retorna variaciones de precio en algunos endpoints
            pct_24h = float(asset.get("variation_24h", 0))
            pct_30d = float(asset.get("variation_30d", 0))

            holdings.append(
                Holding(
                    asset_name=name,
                    asset_symbol=symbol,
                    amount=amount,
                    current_value=Money(amount=value_usd, currency=Currency.USD),
                    performance_24h=Percentage(max(-100.0, min(100.0, pct_24h))),
                    performance_30d=Percentage(max(-100.0, min(100.0, pct_30d))),
                )
            )
        return holdings
