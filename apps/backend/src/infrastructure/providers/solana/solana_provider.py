"""
Provider de wallet Solana (solo lectura).

Credenciales requeridas:
  - address: dirección pública de Solana (base58, ~44 chars)
"""

import asyncio

from application.ports.i_financial_provider import IFinancialProvider
from domain.entities.holding import Holding
from domain.value_objects.money import Currency, Money
from domain.value_objects.percentage import Percentage
from infrastructure.prices.coingecko_price_service import CoinGeckoPriceService

from .solana_client import SolanaClient


class SolanaProvider(IFinancialProvider):
    def __init__(self, address: str) -> None:
        self._address = address
        self._client = SolanaClient()
        self._prices = CoinGeckoPriceService()

    @property
    def name(self) -> str:
        return f"Wallet Solana ({self._address[:6]}…)"

    @property
    def provider_type(self) -> str:
        return "solana"

    async def authenticate(self) -> bool:
        if not await self._client.is_valid_address(self._address):
            raise ValueError(f"Dirección Solana inválida: '{self._address}'")
        try:
            await self._client.get_sol_balance(self._address)
            return True
        except Exception:
            return False

    async def get_holdings(self) -> list[Holding]:
        sol_balance, spl_accounts = await asyncio.gather(
            self._client.get_sol_balance(self._address),
            self._client.get_spl_token_accounts(self._address),
        )

        cg_ids = ["solana"] + [a["cg_id"] for a in spl_accounts]
        prices = await self._prices.get_prices_usd(cg_ids)

        holdings: list[Holding] = []

        if sol_balance > 0:
            sol_price = prices.get("solana", 0.0)
            holdings.append(
                Holding(
                    asset_name="Solana",
                    asset_symbol="SOL",
                    amount=sol_balance,
                    current_value=Money(amount=sol_balance * sol_price, currency=Currency.USD),
                    performance_24h=Percentage(0.0),
                    performance_30d=Percentage(0.0),
                )
            )

        for account in spl_accounts:
            price = prices.get(account["cg_id"], 0.0)
            holdings.append(
                Holding(
                    asset_name=account["name"],
                    asset_symbol=account["symbol"],
                    amount=account["amount"],
                    current_value=Money(amount=account["amount"] * price, currency=Currency.USD),
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
