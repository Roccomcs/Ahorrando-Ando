"""
Provider para posiciones importadas desde CSV de Balanz u otros brokers argentinos.

Credenciales:
  positions: list de dicts con {symbol, name, amount, price_usd}

Las posiciones se guardan en las credenciales encriptadas al momento del import.
El dashboard refleja los valores con precios actualizados de CoinGecko para
criptomonedas conocidas; para activos desconocidos (acciones, bonos) usa el
precio importado como valor de referencia.
"""

import asyncio

from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService

# Mapeo parcial de tickers argentinos a CoinGecko IDs para los que aplica
_CRYPTO_SYMBOLS: dict[str, str] = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "SOL": "solana",
    "ADA": "cardano",
    "DOT": "polkadot",
    "MATIC": "matic-network",
    "LINK": "chainlink",
    "DAI": "dai",
    "AVAX": "avalanche-2",
    "XRP": "ripple",
    "LTC": "litecoin",
}


class BalanzCSVProvider(IFinancialProvider):
    def __init__(self, positions: list) -> None:
        # positions: list of dicts {symbol, name, amount, price_usd}
        self._positions = positions
        self._prices_svc = CoinGeckoPriceService()

    @property
    def name(self) -> str:
        return "Balanz (CSV import)"

    @property
    def provider_type(self) -> str:
        return "balanz_csv"

    async def authenticate(self) -> bool:
        return len(self._positions) > 0

    async def get_holdings(self) -> list[Holding]:
        # Determinar cuáles posiciones son crypto y pedir precios actualizados
        crypto_ids = {
            pos["symbol"]: _CRYPTO_SYMBOLS[pos["symbol"]]
            for pos in self._positions
            if pos["symbol"] in _CRYPTO_SYMBOLS
        }

        prices: dict[str, float] = {}
        if crypto_ids:
            fetched = await self._prices_svc.get_prices_usd(list(crypto_ids.values()))
            for symbol, cg_id in crypto_ids.items():
                prices[symbol] = fetched.get(cg_id, 0.0)

        holdings = []
        for pos in self._positions:
            symbol = pos["symbol"]
            amount = float(pos.get("amount", 0))
            if amount <= 0:
                continue

            # Precio: CoinGecko si es crypto conocida, sino el importado
            price_usd = prices.get(symbol, float(pos.get("price_usd", 0.0)))
            value_usd = amount * price_usd

            holdings.append(
                Holding(
                    asset_name=pos.get("name", symbol),
                    asset_symbol=symbol,
                    amount=amount,
                    current_value=Money(amount=value_usd, currency=Currency.USD),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                )
            )
        return holdings

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}
