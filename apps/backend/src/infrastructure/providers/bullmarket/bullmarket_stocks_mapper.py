from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class BullMarketStocksMapper:
    def map(self, positions: list[dict], ars_to_usd: float) -> list[Holding]:
        return [self._map_one(p, ars_to_usd) for p in positions]

    def _map_one(self, pos: dict, ars_to_usd: float) -> Holding:
        quantity = float(pos.get("quantity", 0))
        last_price = float(pos.get("last_price", 0))
        value_ars = quantity * last_price
        currency = pos.get("currency", "ARS")
        value_usd = value_ars * ars_to_usd if currency == "ARS" else value_ars

        return Holding(
            asset_name=pos.get("description", pos.get("ticker", "")),
            asset_symbol=pos.get("ticker", ""),
            amount=quantity,
            current_value=Money(amount=value_usd, currency=Currency.USD),
            performance_24h=Percentage(0.0),
            performance_30d=Percentage(0.0),
        )
