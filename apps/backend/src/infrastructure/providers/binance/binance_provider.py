from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money

from .binance_account_client import BinanceAccountClient
from .binance_holdings_mapper import BinanceHoldingsMapper
from .binance_prices_client import BinancePricesClient


class BinanceProvider(IFinancialProvider):
    def __init__(self, api_key: str, api_secret: str) -> None:
        self._account_client = BinanceAccountClient(api_key, api_secret)
        self._prices_client = BinancePricesClient()
        self._mapper = BinanceHoldingsMapper()

    @property
    def name(self) -> str:
        return "Binance"

    @property
    def provider_type(self) -> str:
        return "binance"

    async def authenticate(self) -> bool:
        return await self._account_client.ping()

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_holdings(self) -> list[Holding]:
        raw_balances = await self._account_client.fetch_all_balances()
        symbols = [b["asset"] for b in raw_balances]
        prices = await self._prices_client.get_prices_usdt(symbols)
        return self._mapper.map(raw_balances, prices)

    async def get_performance(self) -> dict[str, float]:
        return await self._account_client.fetch_performance_summary()
