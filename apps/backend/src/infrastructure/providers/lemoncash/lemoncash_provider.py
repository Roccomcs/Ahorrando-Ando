from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money

from .lemoncash_client import LemonCashClient
from .lemoncash_holdings_mapper import LemonCashHoldingsMapper


class LemonCashProvider(IFinancialProvider):
    def __init__(self, api_key: str) -> None:
        self._client = LemonCashClient(api_key)
        self._mapper = LemonCashHoldingsMapper()

    @property
    def name(self) -> str:
        return "Lemon Cash"

    @property
    def provider_type(self) -> str:
        return "lemoncash"

    async def authenticate(self) -> bool:
        return await self._client.ping()

    async def get_holdings(self) -> list[Holding]:
        assets = await self._client.fetch_balances()
        return self._mapper.map(assets)

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}
