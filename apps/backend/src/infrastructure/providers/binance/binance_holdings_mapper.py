from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class BinanceHoldingsMapper:
    def map(self, raw_balances: list[dict], prices_usdt: dict[str, float]) -> list[Holding]:
        return [self._map_one(b, prices_usdt) for b in raw_balances]

    def _map_one(self, balance: dict, prices_usdt: dict[str, float]) -> Holding:
        symbol = balance["asset"]
        amount = float(balance["free"]) + float(balance["locked"])
        price = prices_usdt.get(symbol, 0.0)
        return Holding(
            asset_name=symbol,
            asset_symbol=symbol,
            amount=amount,
            current_value=Money(amount=amount * price, currency=Currency.USD),
            performance_24h=Percentage(0.0),
            performance_30d=Percentage(0.0),
            category="crypto",
        )
