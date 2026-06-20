from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from infrastructure.prices.exchange_rate_service import ExchangeRateService

from .mercadopago_holdings_mapper import MercadoPagoHoldingsMapper
from .mercadopago_investments_client import MercadoPagoInvestmentsClient
from .mercadopago_wallet_client import MercadoPagoWalletClient


class MercadoPagoProvider(IFinancialProvider):
    def __init__(self, access_token: str) -> None:
        self._wallet_client = MercadoPagoWalletClient(access_token)
        self._investments_client = MercadoPagoInvestmentsClient(access_token)
        self._mapper = MercadoPagoHoldingsMapper()
        self._exchange = ExchangeRateService()

    @property
    def name(self) -> str:
        return "MercadoPago"

    @property
    def provider_type(self) -> str:
        return "mercadopago"

    async def authenticate(self) -> bool:
        return await self._wallet_client.ping()

    async def get_total_balance(self) -> Money:
        wallet = await self._wallet_client.fetch_wallet_balance()
        ars_amount = wallet["available"]
        ars_to_usd = await self._exchange.get_ars_to_usd()
        return Money(amount=ars_amount * ars_to_usd, currency=Currency.USD)

    async def get_holdings(self) -> list[Holding]:
        import asyncio
        results = await asyncio.gather(
            self._wallet_client.fetch_wallet_balance(),
            self._investments_client.fetch_investments(),
            self._exchange.get_ars_to_usd(),
            return_exceptions=True,
        )
        wallet = results[0] if not isinstance(results[0], Exception) else {"available": 0.0, "currency": "ARS"}
        investments = results[1] if not isinstance(results[1], Exception) else []
        ars_to_usd = results[2] if not isinstance(results[2], Exception) else 0.0
        return self._mapper.map(wallet, investments, ars_to_usd)

    async def get_performance(self) -> dict[str, float]:
        return {"24h": 0.0, "7d": 0.0, "30d": 0.0}
