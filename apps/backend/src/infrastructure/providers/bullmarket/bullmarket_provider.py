from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from infrastructure.prices.exchange_rate_service import ExchangeRateService

from .bullmarket_portfolio_client import BullMarketPortfolioClient
from .bullmarket_stocks_mapper import BullMarketStocksMapper


class BullMarketProvider(IFinancialProvider):
    """
    BullMarket no tiene API pública documentada.
    Esta implementación usa la API interna de su app móvil (capturada con proxy).
    Puede romperse sin aviso si cambian los endpoints.
    Alternativa pendiente: importación CSV desde panel web.
    """

    def __init__(self, username: str, password: str) -> None:
        self._portfolio_client = BullMarketPortfolioClient(username, password)
        self._mapper = BullMarketStocksMapper()
        self._exchange = ExchangeRateService()

    @property
    def name(self) -> str:
        return "BullMarket"

    @property
    def provider_type(self) -> str:
        return "bullmarket"

    async def authenticate(self) -> bool:
        return await self._portfolio_client.login()

    async def get_total_balance(self) -> Money:
        import asyncio
        data_task = self._portfolio_client.fetch_total_value()
        rate_task = self._exchange.get_ars_to_usd()
        data, ars_to_usd = await asyncio.gather(data_task, rate_task)

        amount = float(data["total"])
        currency = data.get("currency", "ARS")
        if currency == "ARS":
            return Money(amount=amount * ars_to_usd, currency=Currency.USD)
        return Money(amount=amount, currency=Currency.USD)

    async def get_holdings(self) -> list[Holding]:
        import asyncio
        positions_task = self._portfolio_client.fetch_positions()
        rate_task = self._exchange.get_ars_to_usd()
        positions, ars_to_usd = await asyncio.gather(positions_task, rate_task)
        return self._mapper.map(positions, ars_to_usd)

    async def get_performance(self) -> dict[str, float]:
        return {"24h": 0.0, "7d": 0.0, "30d": 0.0}
