from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class MercadoPagoHoldingsMapper:
    def map(self, wallet: dict, investments: list[dict], ars_to_usd: float) -> list[Holding]:
        holdings = []

        # Billetera ARS
        ars_available = float(wallet.get("available", 0))
        if ars_available > 0:
            holdings.append(Holding(
                asset_name="Peso Argentino",
                asset_symbol="ARS",
                amount=ars_available,
                current_value=Money(amount=ars_available * ars_to_usd, currency=Currency.USD),
                performance_24h=Percentage(0.0),
                performance_30d=Percentage(0.0),
            ))

        # Inversiones (FCI, etc.)
        for inv in investments:
            amount = float(inv.get("amount", 0))
            if amount <= 0:
                continue
            holdings.append(Holding(
                asset_name=inv.get("name", "Inversión MP"),
                asset_symbol=inv.get("currency_id", "ARS"),
                amount=amount,
                current_value=Money(amount=amount * ars_to_usd, currency=Currency.USD),
                performance_24h=Percentage(0.0),
                performance_30d=Percentage(0.0),
            ))

        return holdings
