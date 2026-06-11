from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage


class OnChainHoldingsMapper:
    def map(
        self,
        native_symbol: str,
        native_name: str,
        native_balance: float,
        native_price_usd: float,
        token_balances: list[tuple[str, str, float, float]],
        # token_balances: [(symbol, name, amount, price_usd), ...]
    ) -> list[Holding]:
        holdings = []

        if native_balance > 0:
            holdings.append(
                Holding(
                    asset_name=native_name,
                    asset_symbol=native_symbol,
                    amount=native_balance,
                    current_value=Money(
                        amount=native_balance * native_price_usd,
                        currency=Currency.USD,
                    ),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                )
            )

        for symbol, name, amount, price_usd in token_balances:
            if amount <= 0:
                continue
            holdings.append(
                Holding(
                    asset_name=name,
                    asset_symbol=symbol,
                    amount=amount,
                    current_value=Money(amount=amount * price_usd, currency=Currency.USD),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                )
            )

        return holdings
