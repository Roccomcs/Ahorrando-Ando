from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from infrastructure.prices.exchange_rate_service import ExchangeRateService

from .iol_auth_client import IOLAuthClient
from .iol_holdings_mapper import IOLHoldingsMapper
from .iol_portfolio_client import IOLPortfolioClient


class IOLProvider(IFinancialProvider):
    def __init__(self, username: str, password: str) -> None:
        self._auth = IOLAuthClient(username, password)
        self._portfolio_client = IOLPortfolioClient(self._auth)
        self._mapper = IOLHoldingsMapper()
        self._exchange = ExchangeRateService()

    @property
    def name(self) -> str:
        return "Invertir Online"

    @property
    def provider_type(self) -> str:
        return "iol"

    async def authenticate(self) -> bool:
        try:
            await self._auth.get_token()
            return True
        except Exception:
            return False

    async def get_holdings(self) -> list[Holding]:
        portafolio, ars_to_usd = await _gather(
            self._portfolio_client.fetch_portfolio(),
            self._exchange.get_ars_to_usd(),
        )
        return self._mapper.map(portafolio, ars_to_usd)

    async def get_total_balance(self) -> Money:
        holdings = await self.get_holdings()
        total = sum(h.current_value.amount for h in holdings)
        return Money(amount=total, currency=Currency.USD)

    async def get_performance(self) -> dict[str, float]:
        return {}


async def _gather(*coros):
    import asyncio
    return await asyncio.gather(*coros)
